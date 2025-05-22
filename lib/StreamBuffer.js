/*
	Stream Kit

	Copyright (c) 2016 - 2024 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const EventEmitter = require( 'events' ) ;
const nodeStream = require( 'stream' ) ;
const Promise = require( 'seventh' ) ;

//function noop() {}



/*
	The StreamBuffer uses a Buffer to read/write easily from/to a Stream, allowing reading/writing bytes, string,
	and featuring every methods of Buffer, and more, even reading bits.
*/

function StreamBuffer( stream , size ) {
	// Duplex and Transform are instances of Readable, but not of Writable (but they still implement it)
	var readable = ( stream instanceof nodeStream.Readable ) ;
	var writable = ( stream instanceof nodeStream.Writable ) || ( stream instanceof nodeStream.Duplex ) ;

	if ( writable ) {
		if ( ! size || typeof size !== 'number' || size < 64 ) { size = 1024 ; }
	}
	else {
		size = 0 ;
	}

	this.stream = stream ;

	// Readable
	this.readable = readable ;
	this.readOffset = 0 ;
	this.currentReadBitByte = 0 ;
	this.remainingReadBits = 0 ;
	this.readableStreamEnded = false ;
	this.onStreamEnd = StreamBuffer.onStreamEnd.bind( this ) ;

	// Writable
	this.writable = writable ;
	this.writeBuffer = size ? Buffer.allocUnsafe( size ) : null ;
	this.writeChunkIndex = 0 ;	// Track the number of chunk added to the write chunk queue
	this.writeChunkQueue = [] ;	// Array of [ chunkIndex , buffer , encoding ]
	this.processingWriteChunkQueue = false ;	// true when the queue is being processed
	this.ptr = 0 ;
	this.currentWriteBitByte = 0 ;
	this.pendingWriteBits = 0 ;
	this.writePromise = null ;
	this.writableStreamEnded = false ;
	this.onStreamDrain = StreamBuffer.onStreamDrain.bind( this ) ;

	this.onceAsync = Promise.promisify( this.once , this ) ;
	this.stream.onceAsync = Promise.promisify( this.stream.once , this.stream ) ;

	this.stream.endAsync = Promise.promisify( this.stream.end , this.stream ) ;
	this.stream.closeAsync = Promise.promisify( this.stream.close , this.stream ) ;

	if ( this.writable ) {
		this.streamKitWritable = true ;
		this.stream.on( 'drain' , this.onStreamDrain ) ;
	}

	// Duplex and Transform are instances of Readable, but not Writable (still they implement it)
	if ( this.readable ) {
		this.streamKitReadable = true ;
		this.stream.on( 'end' , this.onStreamEnd ) ;
	}
}

StreamBuffer.prototype = Object.create( EventEmitter.prototype ) ;
StreamBuffer.prototype.constructor = StreamBuffer ;

module.exports = StreamBuffer ;

// Backward compatibility
StreamBuffer.create = ( ... args ) => new StreamBuffer( ... args ) ;



const COUNT_BIT_MASK = [
	0 ,
	0b1 ,
	0b11 ,
	0b111 ,
	0b1111 ,
	0b11111 ,
	0b111111 ,
	0b1111111 ,
	0b11111111
] ;



// Useful?
StreamBuffer.onStreamEnd = function() {
	this.readableStreamEnded = true ;
	this.emit( 'end' ) ;
} ;



StreamBuffer.onStreamDrain = function() {
	//console.log( "\n\n>>> Drain!\n\n" ) ;
} ;



StreamBuffer.prototype.end = async function() {
	if ( ! this.writable ) { return ; }
	if ( this.pendingWriteBits ) { this.writeCurrentBitByte() ; }
	await this.flush() ;
	this.stream.end() ;
	this.writableStreamEnded = true ;
} ;



/* Read part */



StreamBuffer.prototype.read = async function( size ) {
	var buffer , chunk , ptr = 0 ;

	buffer = this.stream.read( size ) ;

	if ( ! buffer ) {
		await this.stream.onceAsync( 'readable' ) ;
		buffer = this.stream.read( size ) ;
	}

	if ( ! buffer ) {
		// Either there is nothing more, or the data is so big that it cannot be stored without chunks
		//console.log( "Can't read all at once." ) ;
		buffer = Buffer.allocUnsafe( size ) ;

		for ( ;; ) {
			// Read as much as we can...
			chunk = this.stream.read() ;

			if ( ! chunk ) {
				throw new Error( "Can't read enough bytes (chunk mode): " + ptr + '/' + size ) ;
			}

			this.readOffset += chunk.length ;

			if ( ptr + chunk.length > size ) {
				throw new Error( "Unexpected too big buffer" ) ;
			}

			chunk.copy( buffer , ptr ) ;
			ptr += chunk.length ;

			if ( ptr === size ) { break ; }

			await this.stream.onceAsync( 'readable' ) ;

			// Now try again to read the remaining size...
			chunk = this.stream.read( size - ptr ) ;

			if ( chunk ) {
				this.readOffset += chunk.length ;
				chunk.copy( buffer , ptr ) ;
				break ;
			}
		}

		return buffer ;
	}

	this.readOffset += buffer.length ;

	if ( buffer.length !== size ) {
		throw new Error( "Can't read enough bytes: " + buffer.length + '/' + size ) ;
	}

	return buffer ;
} ;



StreamBuffer.prototype.readUntilByteValue = async function( byteValue = 0 ) {
	var allocSize = 1024 ,
		bufferList = [] ,
		buffer = Buffer.allocUnsafe( allocSize ) ,
		ptr = 0 ;

	byteValue = + byteValue || 0 ;

	if ( byteValue < 0 || byteValue >= 256 ) {
		throw new Error( "Searching for a byte value out of the 0-255 range: " + byteValue ) ;
	}

	for ( ;; ) {
		let singleByteBuffer = this.stream.read( 1 ) ;

		if ( ! singleByteBuffer ) {
			await this.stream.onceAsync( 'readable' ) ;
			singleByteBuffer = this.stream.read( 1 ) ;
			if ( ! singleByteBuffer ) {
				throw new Error( "Can't read a single byte: " + ptr ) ;
			}
		}

		this.readOffset ++ ;

		// No need to alloc anything for the last byte
		if ( singleByteBuffer[ 0 ] === byteValue ) {
			if ( ptr ) { bufferList.push( buffer.slice( 0 , ptr ) ) ; }
			bufferList.push( singleByteBuffer ) ;
			return Buffer.concat( bufferList ) ;
		}

		if ( ptr >= buffer.length ) {
			bufferList.push( buffer ) ;
			buffer = Buffer.allocUnsafe( allocSize ) ;
			ptr = 0 ;
		}

		buffer[ ptr ++ ] = singleByteBuffer[ 0 ] ;
	}
} ;



// It's separated from .read() because this one is triggered from userland, and thus should reset bit reading
StreamBuffer.prototype.readBuffer = function( size ) {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return this.read( size ) ;
} ;



// Skip some bytes we don't have interest in
StreamBuffer.prototype.skip = function( byteLength ) {
	this.remainingReadBits = this.currentReadBitByte = 0 ;

	// /!\ Maybe it could be better to have some dedicated mecanism for skipping bytes
	return this.read( byteLength ) ;
} ;



StreamBuffer.prototype.readUInt8 = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 1 ) ).readUInt8( 0 ) ;
} ;



StreamBuffer.prototype.readUInt16 =
StreamBuffer.prototype.readUInt16BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 2 ) ).readUInt16BE( 0 ) ;
} ;

StreamBuffer.prototype.readUInt16LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 2 ) ).readUInt16LE( 0 ) ;
} ;



StreamBuffer.prototype.readUInt32 =
StreamBuffer.prototype.readUInt32BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readUInt32BE( 0 ) ;
} ;

StreamBuffer.prototype.readUInt32LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readUInt32LE( 0 ) ;
} ;



StreamBuffer.prototype.readUInt64 =
StreamBuffer.prototype.readUInt64BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readBigUInt64BE( 0 ) ;
} ;

StreamBuffer.prototype.readUInt64LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readBigUInt64LE( 0 ) ;
} ;



StreamBuffer.prototype.readInt8 = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 1 ) ).readInt8( 0 ) ;
} ;



StreamBuffer.prototype.readInt16 =
StreamBuffer.prototype.readInt16BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 2 ) ).readInt16BE( 0 ) ;
} ;

StreamBuffer.prototype.readInt16LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 2 ) ).readInt16LE( 0 ) ;
} ;



StreamBuffer.prototype.readInt32 =
StreamBuffer.prototype.readInt32BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readInt32BE( 0 ) ;
} ;

StreamBuffer.prototype.readInt32LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readInt32LE( 0 ) ;
} ;



StreamBuffer.prototype.readInt64 =
StreamBuffer.prototype.readInt64BE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readBigInt64BE( 0 ) ;
} ;

StreamBuffer.prototype.readInt64LE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readBigInt64LE( 0 ) ;
} ;



StreamBuffer.prototype.readFloat =
StreamBuffer.prototype.readFloatBE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readFloatBE( 0 ) ;
} ;

StreamBuffer.prototype.readFloatLE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 4 ) ).readFloatLE( 0 ) ;
} ;



StreamBuffer.prototype.readNumber =
StreamBuffer.prototype.readDouble =
StreamBuffer.prototype.readDoubleBE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readDoubleBE( 0 ) ;
} ;

StreamBuffer.prototype.readDoubleLE = async function() {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( 8 ) ).readDoubleLE( 0 ) ;
} ;



StreamBuffer.prototype.readString = async function( byteLength , encoding = 'latin1' ) {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	return ( await this.read( byteLength ) ).toString( encoding ) ;
} ;

StreamBuffer.prototype.readUtf8 = function( byteLength ) { return this.readString( byteLength , 'utf8' ) ; } ;



// LPS: Length Prefixed String.
// Read the UTF8 BYTE LENGTH using an UInt8.
StreamBuffer.prototype.readLps8String = async function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = await this.readUInt8() ;
	return await this.readString( byteLength , encoding ) ;
} ;

StreamBuffer.prototype.readLps8Utf8 = function() { return this.readLps8String( 'utf8' ) ; } ;



StreamBuffer.prototype.readLps16String =
StreamBuffer.prototype.readLps16BEString = async function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = await this.readUInt16() ;
	return await this.readString( byteLength , encoding ) ;
} ;

StreamBuffer.prototype.readLps16Utf8 = StreamBuffer.prototype.readLps16BEUtf8 = function() { return this.readLps16String( 'utf8' ) ; } ;

StreamBuffer.prototype.readLps16LEString = async function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = await this.readUInt16LE() ;
	return await this.readString( byteLength , encoding ) ;
} ;

StreamBuffer.prototype.readLps16LEUtf8 = function() { return this.readLps16LEString( 'utf8' ) ; } ;



StreamBuffer.prototype.readLps32String =
StreamBuffer.prototype.readLps32BEString = async function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = await this.readUInt32() ;
	return await this.readString( byteLength , encoding ) ;
} ;

StreamBuffer.prototype.readLps32Utf8 = StreamBuffer.prototype.readLps32BEUtf8 = function() { return this.readLps32String( 'utf8' ) ; } ;

StreamBuffer.prototype.readLps32LEString = async function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = await this.readUInt32LE() ;
	return await this.readString( byteLength , encoding ) ;
} ;

StreamBuffer.prototype.readLps32LEUtf8 = function() { return this.readLps32LEString( 'utf8' ) ; } ;



StreamBuffer.prototype.readNullTerminatedString = async function( encoding = 'latin1' ) {
	this.remainingReadBits = this.currentReadBitByte = 0 ;
	var buffer = await this.readUntilByteValue( 0 ) ;
	if ( buffer.length <= 1 ) { return '' ; }
	return buffer.toString( encoding , 0 , buffer.length - 1 ) ;
} ;

StreamBuffer.prototype.readNullTerminatedUtf8 = function() { return this.readNullTerminatedString( 'utf8' ) ; } ;



StreamBuffer.prototype.readLps8Buffer = async function() {
	var byteLength = await this.readUInt8() ;
	return await this.readBuffer( byteLength ) ;
} ;



StreamBuffer.prototype.readLps16Buffer =
StreamBuffer.prototype.readLps16BEBuffer = async function() {
	var byteLength = await this.readUInt16() ;
	return await this.readBuffer( byteLength ) ;
} ;

StreamBuffer.prototype.readLps16LEBuffer = async function() {
	var byteLength = await this.readUInt16LE() ;
	return await this.readBuffer( byteLength ) ;
} ;



StreamBuffer.prototype.readLps32Buffer =
StreamBuffer.prototype.readLps32BEBuffer = async function() {
	var byteLength = await this.readUInt32() ;
	return await this.readBuffer( byteLength ) ;
} ;

StreamBuffer.prototype.readLps32LEBuffer = async function() {
	var byteLength = await this.readUInt32LE() ;
	return await this.readBuffer( byteLength ) ;
} ;



StreamBuffer.prototype.readCurrentBitByte = async function() {
	return ( await this.read( 1 ) ).readUInt8( 0 ) ;
} ;



// Read unsigned bits
StreamBuffer.prototype.readUBits =
StreamBuffer.prototype.readUBitsBE = async function( bitCount ) {
	if ( bitCount > 8 || bitCount < 1 ) {
		throw new Error( "StreamBuffer#readUBits() expecting bitCount to be between 1 and 8 but got: " + bitCount ) ;
	}

	if ( ! this.remainingReadBits ) {
		this.currentReadBitByte = await this.readCurrentBitByte() ;
		let v = this.currentReadBitByte >> 8 - bitCount ;
		this.remainingReadBits = 8 - bitCount ;
		return v ;
	}

	if ( bitCount <= this.remainingReadBits ) {
		// Enough bits in the current byte
		let v = ( this.currentReadBitByte >> this.remainingReadBits - bitCount ) & COUNT_BIT_MASK[ bitCount ] ;
		this.remainingReadBits -= bitCount ;
		return v ;
	}

	// It's splitted in two parts
	let bitCountLeftOver = bitCount - this.remainingReadBits ;
	let leftV = ( this.currentReadBitByte & COUNT_BIT_MASK[ this.remainingReadBits ] ) << bitCountLeftOver ;

	this.currentReadBitByte = await this.readCurrentBitByte() ;
	let rightV = this.currentReadBitByte >> 8 - bitCountLeftOver ;
	this.remainingReadBits = 8 - bitCountLeftOver ;

	return leftV + rightV ;
} ;




/* Write part */



// Internal
StreamBuffer.prototype.writeToStream = function( buffer , encoding ) {
	var promise = new Promise() ,
		writeChunkIndex = this.writeChunkIndex ++ ;

	var listener = writeChunkIndex_ => {
		if ( writeChunkIndex_ === writeChunkIndex ) {
			this.removeListener( 'chunkSent' , listener ) ;
			promise.resolve() ;
		}
	} ;

	this.on( 'chunkSent' , listener ) ;
	this.writeChunkQueue.push( [ writeChunkIndex , buffer , encoding ] ) ;
	this.processWriteChunkQueue() ;

	return promise ;
} ;



// Internal
StreamBuffer.prototype.processWriteChunkQueue = async function() {
	if ( this.processingWriteChunkQueue ) { return ; }

	this.processingWriteChunkQueue = true ;

	while ( this.writeChunkQueue.length ) {
		let [ writeChunkIndex , buffer , encoding ] = this.writeChunkQueue.shift() ;

		if ( this.stream.writableNeedDrain ) {
			await this.stream.onceAsync( 'drain' ) ;
		}

		await this._writeToStreamNow( buffer , encoding ) ;
		this.emit( 'chunkSent' , writeChunkIndex ) ;
	}

	this.processingWriteChunkQueue = false ;
} ;



// Internal
StreamBuffer.prototype._writeToStreamNow = async function( buffer , encoding ) {
	var promise = new Promise() ;
	this.stream.write( buffer , encoding , error => {
		if ( error ) { promise.reject( error ) ; }
		else { promise.resolve() ; }
	} ) ;
	return promise ;
} ;



// Internal and API
StreamBuffer.prototype.flush = async function() {
	if ( ! this.ptr ) { return ; }

	var buffer = Buffer.allocUnsafe( this.ptr ) ;
	this.writeBuffer.copy( buffer , 0 , 0 , this.ptr ) ;
	this.ptr = 0 ;

	await this.writeToStream( buffer ) ;
} ;



// Internal
StreamBuffer.prototype.write = function( buffer , start = 0 , end = buffer.length ) {
	var byteLength = end - start ;

	// The buffer is larger than the internal buffer, flush the internal buffer and write the buffer directly on the stream
	if ( byteLength >= this.writeBuffer.length ) {
		// Always flush, or thing would be in the wrong order!
		this.flush() ;
		this.writeToStream(
			start === 0 && end === buffer.length ? buffer :
			buffer.slice( start , end )
		) ;
		return ;
	}

	// If we can't store the chunk into the buffer, flush it now!
	if ( this.ptr >= this.writeBuffer.length - byteLength + 1 ) {
		this.flush() ;
	}

	buffer.copy( this.writeBuffer , this.ptr , start , end ) ;
	this.ptr += byteLength ;
} ;



// Internal
StreamBuffer.prototype.prepareWrite = function( byteLength ) {
	if ( this.pendingWriteBits ) { this.writeCurrentBitByte() ; }
	if ( this.ptr >= this.writeBuffer.length - byteLength + 1 ) { this.flush() ; }
} ;



// Internal
StreamBuffer.prototype.writeCurrentBitByte = function() {
	if ( ! this.pendingWriteBits ) { return ; }

	if ( this.ptr >= this.writeBuffer.length ) { this.flush() ; }

	this.writeBuffer.writeUInt8( this.currentWriteBitByte , this.ptr ) ;
	this.currentWriteBitByte = 0 ;
	this.pendingWriteBits = 0 ;
	this.ptr ++ ;
} ;



// It's separated from .write() because this one is triggered from userland, and thus should reset bit reading
StreamBuffer.prototype.writeBuffer = function( buffer , start = 0 , end = buffer.length ) {
	if ( this.pendingWriteBits ) { this.writeCurrentBitByte() ; }
	this.write( buffer , start , end ) ;
} ;



StreamBuffer.prototype.writeUInt8 = function( v ) {
	this.prepareWrite( 1 ) ;
	this.writeBuffer.writeUInt8( v , this.ptr ) ;
	this.ptr ++ ;
} ;



StreamBuffer.prototype.writeUInt16 =
StreamBuffer.prototype.writeUInt16BE = function( v ) {
	this.prepareWrite( 2 ) ;
	this.writeBuffer.writeUInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;

StreamBuffer.prototype.writeUInt16LE = function( v ) {
	this.prepareWrite( 2 ) ;
	this.writeBuffer.writeUInt16LE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



StreamBuffer.prototype.writeUInt32 =
StreamBuffer.prototype.writeUInt32BE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeUInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

StreamBuffer.prototype.writeUInt32LE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeUInt32LE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



StreamBuffer.prototype.writeUInt64 =
StreamBuffer.prototype.writeUInt64BE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeBigUInt64BE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

StreamBuffer.prototype.writeUInt64LE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeBigUInt64LE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



StreamBuffer.prototype.writeInt8 = function( v ) {
	this.prepareWrite( 1 ) ;
	this.writeBuffer.writeInt8( v , this.ptr ) ;
	this.ptr ++ ;
} ;



StreamBuffer.prototype.writeInt16 =
StreamBuffer.prototype.writeInt16BE = function( v ) {
	this.prepareWrite( 2 ) ;
	this.writeBuffer.writeInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;

StreamBuffer.prototype.writeInt16LE = function( v ) {
	this.prepareWrite( 2 ) ;
	this.writeBuffer.writeInt16LE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



StreamBuffer.prototype.writeInt32 =
StreamBuffer.prototype.writeInt32BE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

StreamBuffer.prototype.writeInt32LE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeInt32LE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



StreamBuffer.prototype.writeInt64 =
StreamBuffer.prototype.writeInt64BE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeBigInt64BE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

StreamBuffer.prototype.writeInt64LE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeBigInt64LE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



StreamBuffer.prototype.writeFloat =
StreamBuffer.prototype.writeFloatBE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeFloatBE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

StreamBuffer.prototype.writeFloatLE = function( v ) {
	this.prepareWrite( 4 ) ;
	this.writeBuffer.writeFloatLE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



StreamBuffer.prototype.writeNumber =
StreamBuffer.prototype.writeDouble =
StreamBuffer.prototype.writeDoubleBE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeDoubleBE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

StreamBuffer.prototype.writeDoubleLE = function( v ) {
	this.prepareWrite( 8 ) ;
	this.writeBuffer.writeDoubleLE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



StreamBuffer.prototype.writeString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	if ( this.pendingWriteBits ) { this.writeCurrentBitByte() ; }

	// The string is larger than the buffer, flush the buffer and write the string directly on the stream
	if ( byteLength >= this.writeBuffer.length ) {
		// Always flush, or thing would be in the wrong order!
		this.flush() ;
		this.writeToStream( v , encoding ) ;
		return ;
	}

	// If we can't store the chunk into the buffer, flush it now!
	if ( this.ptr >= this.writeBuffer.length - byteLength + 1 ) {
		this.flush() ;
	}

	this.writeBuffer.write( v , this.ptr , byteLength , encoding ) ;
	this.ptr += byteLength ;
} ;

StreamBuffer.prototype.writeUtf8 = function( v , byteLength ) { return this.writeString( v , byteLength , 'utf8' ) ; } ;



// LPS: Length prefixed string.
// Store the UTF8 BYTE LENGTH using an UInt8.
// Computing byteLength is probably costly, so if the upper layer know it, it can saves some cycles
StreamBuffer.prototype.writeLps8String = function( v , byteLength ,  encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	if ( byteLength > 255 ) {
		// Error! What should we do?
		throw new RangeError( 'The string exceed the LPS 8 bits limit' ) ;
	}

	// Write the LPS
	this.writeUInt8( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

StreamBuffer.prototype.writeLps8Utf8 = function( v , byteLength ) { return this.writeLps8String( v , byteLength , 'utf8' ) ; } ;



StreamBuffer.prototype.writeLps16String =
StreamBuffer.prototype.writeLps16BEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	if ( byteLength > 65535 ) {
		// Error! What should we do?
		throw new RangeError( 'The string exceed the LPS 16 bits limit' ) ;
	}

	// Write the LPS
	this.writeUInt16( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

StreamBuffer.prototype.writeLps16Utf8 = StreamBuffer.prototype.writeLps16BEUtf8 = function( v , byteLength ) { return this.writeLps16String( v , byteLength , 'utf8' ) ; } ;

StreamBuffer.prototype.writeLps16LEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	if ( byteLength > 65535 ) {
		// Error! What should we do?
		throw new RangeError( 'The string exceed the LPS 16 bits limit' ) ;
	}

	// Write the LPS
	this.writeUInt16LE( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

StreamBuffer.prototype.writeLps16LEUtf8 = function( v , byteLength ) { return this.writeLps16LEString( v , byteLength , 'utf8' ) ; } ;



StreamBuffer.prototype.writeLps32String =
StreamBuffer.prototype.writeLps32BEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	// Write the LPS
	this.writeUInt32( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

StreamBuffer.prototype.writeLps32Utf8 = StreamBuffer.prototype.writeLps32BEUtf8 = function( v , byteLength ) { return this.writeLps32String( v , byteLength , 'utf8' ) ; } ;

StreamBuffer.prototype.writeLps32LEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	// Write the LPS
	this.writeUInt32LE( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

StreamBuffer.prototype.writeLps32LEUtf8 = function( v , byteLength ) { return this.writeLps32LEString( v , byteLength , 'utf8' ) ; } ;



StreamBuffer.prototype.writeNullTerminatedString = function( v , encoding = 'latin1' ) {
	if ( v.includes( '\x00' ) ) {
		throw new Error( "The string already contains the NUL character, which is forbidden inside a null-terminated string" ) ;
	}

	v += '\x00' ;
	return this.writeString( v , Buffer.byteLength( v , encoding ) , encoding ) ;
} ;

StreamBuffer.prototype.writeNullTerminatedUtf8 = function( v ) { return this.writeNullTerminatedString( v , 'utf8' ) ; } ;



StreamBuffer.prototype.writeLps8Buffer = function( v ) {
	if ( v.length > 255 ) { throw new RangeError( 'The buffer exceed the LPS 8 bits limit' ) ; }
	this.writeUInt8( v.length ) ;
	this.writeBuffer( v ) ;
} ;



StreamBuffer.prototype.writeLps16Buffer =
StreamBuffer.prototype.writeLps16BEBuffer = function( v ) {
	if ( v.length > 65535 ) { throw new RangeError( 'The buffer exceed the LPS 16 bits limit' ) ; }
	this.writeUInt16( v.length ) ;
	this.writeBuffer( v ) ;
} ;

StreamBuffer.prototype.writeLps16LEBuffer = function( v ) {
	if ( v.length > 65535 ) { throw new RangeError( 'The buffer exceed the LPS 16 bits limit' ) ; }
	this.writeUInt16LE( v.length ) ;
	this.writeBuffer( v ) ;
} ;



StreamBuffer.prototype.writeLps32Buffer =
StreamBuffer.prototype.writeLps32BEBuffer = function( v ) {
	this.writeUInt32( v.length ) ;
	this.writeBuffer( v ) ;
} ;

StreamBuffer.prototype.writeLps32LEBuffer = function( v ) {
	this.writeUInt32LE( v.length ) ;
	this.writeBuffer( v ) ;
} ;



// Write unsigned bits
StreamBuffer.prototype.writeUBits =
StreamBuffer.prototype.writeUBitsBE = function( v , bitCount ) {
	if ( bitCount > 8 || bitCount < 1 ) {
		throw new Error( "StreamBuffer#writeUBits() expecting bitCount to be between 1 and 8 but got: " + bitCount ) ;
	}

	v &= COUNT_BIT_MASK[ bitCount ] ;

	var remainingBits = 8 - this.pendingWriteBits ;

	if ( bitCount <= remainingBits ) {
		// Enough bits in the current byte
		this.currentWriteBitByte |= v << remainingBits - bitCount ;
		this.pendingWriteBits += bitCount ;

		if ( this.pendingWriteBits === 8 ) {
			this.writeCurrentBitByte() ;
		}

		return ;
	}

	// Split in two parts
	let bitCountLeftOver = bitCount - remainingBits ;
	let leftV = v >> bitCountLeftOver ;
	let rightV = v & COUNT_BIT_MASK[ bitCountLeftOver ] ;

	this.currentWriteBitByte |= leftV ;
	this.writeCurrentBitByte() ;

	this.currentWriteBitByte = rightV << 8 - bitCountLeftOver ;
	this.pendingWriteBits = bitCountLeftOver ;
} ;

