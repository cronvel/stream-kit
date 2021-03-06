/*
	Stream Kit

	Copyright (c) 2016 - 2021 Cédric Ronvel

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
	this.streamEnded = false ;

	// Writable
	this.writable = writable ;
	this.buffer = size && Buffer.allocUnsafe( size ) ;
	this.ptr = 0 ;
	this.writeReady = true ;
	this.streamWriteReady = true ;
	this.onStreamDrain = StreamBuffer.onStreamDrain.bind( this ) ;
	this.onStreamEnd = StreamBuffer.onStreamEnd.bind( this ) ;

	this.onceAsync = Promise.promisify( this.once , this ) ;
	this.stream.onceAsync = Promise.promisify( this.stream.once , this.stream ) ;

	this.stream.endAsync = Promise.promisify( this.stream.end , this.stream ) ;
	this.stream.closeAsync = Promise.promisify( this.stream.close , this.stream ) ;

	if ( this.writable ) {
		this.stream.on( 'drain' , this.onStreamDrain ) ;
	}

	// Duplex and Transform are instances of Readable, but not Writable (still they implement it)
	if ( this.readable ) {
		this.stream.on( 'end' , this.onStreamEnd ) ;
	}
}

StreamBuffer.prototype = Object.create( EventEmitter.prototype ) ;
StreamBuffer.prototype.constructor = StreamBuffer ;

module.exports = StreamBuffer ;

// Backward compatibility
StreamBuffer.create = ( ... args ) => new StreamBuffer( ... args ) ;



/* Read part */



StreamBuffer.prototype.readBuffer =
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



StreamBuffer.prototype.readNumber =
StreamBuffer.prototype.readDouble =
StreamBuffer.prototype.readDoubleBE = async function() {
	return ( await this.read( 8 ) ).readDoubleBE( 0 ) ;
} ;



StreamBuffer.prototype.readUInt8 = async function() {
	return ( await this.read( 1 ) ).readUInt8( 0 ) ;
} ;



StreamBuffer.prototype.readUInt16 =
StreamBuffer.prototype.readUInt16BE = async function() {
	return ( await this.read( 2 ) ).readUInt16BE( 0 ) ;
} ;



StreamBuffer.prototype.readUInt32 =
StreamBuffer.prototype.readUInt32BE = async function() {
	return ( await this.read( 4 ) ).readUInt32BE( 0 ) ;
} ;



StreamBuffer.prototype.readInt8 = async function() {
	return ( await this.read( 1 ) ).readInt8( 0 ) ;
} ;



StreamBuffer.prototype.readInt16 =
StreamBuffer.prototype.readInt16BE = async function() {
	return ( await this.read( 2 ) ).readInt16BE( 0 ) ;
} ;



StreamBuffer.prototype.readInt32 =
StreamBuffer.prototype.readInt32BE = async function() {
	return ( await this.read( 4 ) ).readInt32BE( 0 ) ;
} ;



StreamBuffer.prototype.readUtf8 = async function( byteLength ) {
	return ( await this.read( byteLength ) ).toString( 'utf8' ) ;
} ;



// LPS: Length Prefixed String.
// Read the UTF8 BYTE LENGTH using an UInt8.
StreamBuffer.prototype.readLps8Utf8 = async function() {
	//console.log( "\n\n\nreadLps8Utf8" ) ;
	// Read the LPS
	var byteLength = await this.readUInt8() ;
	return await this.readUtf8( byteLength ) ;
} ;



StreamBuffer.prototype.readLps16Utf8 = async function() {
	//console.log( "\n\n\nreadLps16Utf8" ) ;
	// Read the LPS
	var byteLength = await this.readUInt16() ;
	return await this.readUtf8( byteLength ) ;
} ;



StreamBuffer.prototype.readLps32Utf8 = async function() {
	//console.log( "\n\n\nreadLps32Utf8" ) ;
	// Read the LPS
	var byteLength = await this.readUInt32() ;
	return await this.readUtf8( byteLength ) ;
} ;



StreamBuffer.prototype.readLps8Buffer = async function() {
	var byteLength = await this.readUInt8() ;
	return await this.readBuffer( byteLength ) ;
} ;



StreamBuffer.prototype.readLps16Buffer = async function() {
	var byteLength = await this.readUInt16() ;
	return await this.readBuffer( byteLength ) ;
} ;



StreamBuffer.prototype.readLps32Buffer = async function() {
	var byteLength = await this.readUInt32() ;
	return await this.readBuffer( byteLength ) ;
} ;



// Useful?
StreamBuffer.onStreamEnd = function() {
	this.streamEnded = true ;
	this.emit( 'end' ) ;
} ;





/* Write part */



StreamBuffer.onStreamDrain = function() {
	//console.log( "\n\n>>> Drain!\n\n" ) ;
	this.streamWriteReady = true ;
} ;



StreamBuffer.prototype._writeToStream = function( buffer , encoding ) {
	var p ;

	if ( this.streamWriteReady ) {
		p = Promise.resolve() ;
	}
	else {
		//console.log( "Need drain!" ) ;
		p = this.stream.onceAsync( 'drain' ) ;
	}

	return p.then( () => new Promise( ( resolve , reject ) => {
		this.streamWriteReady = this.stream.write( buffer , encoding , error => {
			return error ? reject( error ) : resolve() ;
		} ) ;
	} ) ) ;
} ;



StreamBuffer.prototype.flush = async function() {
	var buffer ;

	//console.log( "FLUSH required!" ) ;

	if ( ! this.ptr ) { return ; }

	buffer = this.ptr >= this.buffer.length ? this.buffer : this.buffer.slice( 0 , this.ptr ) ;

	this.writeReady = false ;

	//console.log( "FLUSHING!" , this.streamWriteReady ) ;
	await this._writeToStream( buffer ) ;
	//console.log( "\n\n>>> this.streamWriteReady" , this.streamWriteReady ) ;
	this.ptr = 0 ;
	this.writeReady = true ;
	//console.log( "FLUSHED!" ) ;
	//this.emit( 'flushed' ) ;
} ;



StreamBuffer.prototype.writeBuffer =
StreamBuffer.prototype.write = async function( buffer ) {
	var byteLength = buffer.length ;

	if ( ! this.writeReady ) {
		await this.flush() ;
	}

	// The buffer is larger than the internal buffer, flush the internal buffer and write the buffer directly on the stream
	if ( byteLength >= this.buffer.length ) {
		// Always flush, or thing would be in the wrong order!
		await this.flush() ;
		await this._writeToStream( buffer ) ;
		//console.log( "\n\n>>> this.streamWriteReady" , this.streamWriteReady ) ;
		return ;
	}

	// If we can't store the chunk into the buffer, flush it now!
	if ( this.ptr >= this.buffer.length - byteLength + 1 ) {
		//console.log( 'Flush!' ) ;
		await this.flush() ;
	}

	buffer.copy( this.buffer , this.ptr ) ;
	this.ptr += byteLength ;
} ;



StreamBuffer.prototype.writeNumber =
StreamBuffer.prototype.writeDouble =
StreamBuffer.prototype.writeDoubleBE = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length - 7 ) {
		await this.flush() ;
	}

	this.buffer.writeDoubleBE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



StreamBuffer.prototype.writeUInt8 = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length ) {
		await this.flush() ;
	}

	this.buffer.writeUInt8( v , this.ptr ) ;
	this.ptr += 1 ;
} ;



StreamBuffer.prototype.writeUInt16 =
StreamBuffer.prototype.writeUInt16BE = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length - 1 ) {
		await this.flush() ;
	}

	this.buffer.writeUInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



StreamBuffer.prototype.writeUInt32 =
StreamBuffer.prototype.writeUInt32BE = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length - 3 ) {
		await this.flush() ;
	}

	this.buffer.writeUInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



StreamBuffer.prototype.writeInt8 = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length ) {
		await this.flush() ;
	}

	this.buffer.writeInt8( v , this.ptr ) ;
	this.ptr += 1 ;
} ;



StreamBuffer.prototype.writeInt16 =
StreamBuffer.prototype.writeInt16BE = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length - 1 ) {
		await this.flush() ;
	}

	this.buffer.writeInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



StreamBuffer.prototype.writeInt32 =
StreamBuffer.prototype.writeInt32BE = async function( v ) {
	if ( ! this.writeReady || this.ptr >= this.buffer.length - 3 ) {
		await this.flush() ;
	}

	this.buffer.writeInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



StreamBuffer.prototype.writeUtf8 = async function( v , byteLength ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , 'utf8' ) ;
	}

	if ( ! this.writeReady ) {
		await this.flush() ;
	}

	// The string is larger than the buffer, flush the buffer and write the string directly on the stream
	if ( byteLength >= this.buffer.length ) {
		// Always flush, or thing would be in the wrong order!
		await this.flush() ;
		await this._writeToStream( v , 'utf8' ) ;
		//console.log( "\n\n>>> this.streamWriteReady" , this.streamWriteReady ) ;
		return ;
	}

	// If we can't store the chunk into the buffer, flush it now!
	if ( this.ptr >= this.buffer.length - byteLength + 1 ) {
		//console.log( 'Flush!' ) ;
		await this.flush() ;
	}

	this.buffer.write( v , this.ptr , 'utf8' ) ;
	this.ptr += byteLength ;
} ;



// LPS: Length prefixed string.
// Store the UTF8 BYTE LENGTH using an UInt8.
// Computing byteLength is probably costly, so if the upper layer know it, it can saves some cycles
StreamBuffer.prototype.writeLps8Utf8 = async function( v , byteLength ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , 'utf8' ) ;
	}

	//console.log( "writeLps8Utf8" , byteLength ) ;

	if ( byteLength > 255 ) {
		// Error! What should we do?
		throw new RangeError( 'The string exceed the LPS 8 bits limit' ) ;
	}

	// Write the LPS
	await this.writeUInt8( byteLength ) ;
	await this.writeUtf8( v , byteLength ) ;
} ;



StreamBuffer.prototype.writeLps16Utf8 = async function( v , byteLength ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , 'utf8' ) ;
	}

	//console.log( "writeLps16Utf8" , byteLength ) ;

	if ( byteLength > 65535 ) {
		// Error! What should we do?
		throw new RangeError( 'The string exceed the LPS 16 bits limit' ) ;
	}

	// Write the LPS
	await this.writeUInt16( byteLength ) ;
	await this.writeUtf8( v , byteLength ) ;
} ;



StreamBuffer.prototype.writeLps32Utf8 = async function( v , byteLength ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , 'utf8' ) ;
	}

	//console.log( "writeLps32Utf8" , byteLength ) ;

	// Write the LPS
	await this.writeUInt32( byteLength ) ;
	await this.writeUtf8( v , byteLength ) ;
} ;



StreamBuffer.prototype.writeLps8Buffer = async function( v ) {
	if ( v.length > 255 ) { throw new RangeError( 'The buffer exceed the LPS 8 bits limit' ) ; }
	await this.writeUInt8( v.length ) ;
	await this.writeBuffer( v ) ;
} ;



StreamBuffer.prototype.writeLps16Buffer = async function( v ) {
	if ( v.length > 65535 ) { throw new RangeError( 'The buffer exceed the LPS 16 bits limit' ) ; }
	await this.writeUInt16( v.length ) ;
	await this.writeBuffer( v ) ;
} ;



StreamBuffer.prototype.writeLps32Buffer = async function( v ) {
	await this.writeUInt32( v.length ) ;
	await this.writeBuffer( v ) ;
} ;

