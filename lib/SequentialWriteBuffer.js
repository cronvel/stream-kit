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



// Bring all the good stuffs of StreamBuffer to regular buffer.
// It will manage an auto-growing buffer.



function SequentialWriteBuffer( chunkSize = 1024 , chunkSizeMultiplier = 1.5 ) {
	this.chunkSize = chunkSize ;
	this.chunkSizeMultiplier = chunkSizeMultiplier ;
	this.buffer = Buffer.allocUnsafe( this.chunkSize ) ;
	this.ptr = 0 ;
	this.chunks = [] ;
	this.allChunksSize = 0 ;

	// Bit writing part
	this.currentBitByte = 0 ;		// current byte where to push bits
	this.remainingBits = 0 ;	// remaining bits inside the current byte, if 0 there is no byte where to put bits
}

module.exports = SequentialWriteBuffer ;



SequentialWriteBuffer.prototype.size = function() { return this.allChunksSize + this.ptr ; } ;



SequentialWriteBuffer.prototype.getBuffer = function( view = false ) {
	if ( ! this.chunks.length ) {
		let slice = this.buffer.slice( 0 , this.ptr ) ;
		if ( view ) { return slice ; }
		return Buffer.from( slice ) ;
	}

	if ( ! this.ptr ) { return Buffer.concat( this.chunks ) ; }
	return Buffer.concat( [ ... this.chunks , this.buffer.slice( 0 , this.ptr ) ] ) ;
} ;



// Ensure that we can write that length to the current buffer, or create a new one
SequentialWriteBuffer.prototype.ensureBytes = function( byteLength ) {
	// Always reset bits
	this.remainingBits = 0 ;
	this.currentBitByte = 0 ;

	if ( byteLength <= this.buffer.length - this.ptr ) { return ; }

	this.chunks.push( this.buffer.slice( 0 , this.ptr ) ) ;
	this.allChunksSize += this.ptr ;

	// The next chunk wil be larger, to avoid allocation of too much buffers,
	// it also should at least be large enough for the next write.
	this.chunkSize = Math.ceil( Math.max( byteLength , this.chunkSize * this.chunkSizeMultiplier ) ) ;

	this.buffer = Buffer.allocUnsafe( this.chunkSize ) ;
	this.ptr = 0 ;
} ;



SequentialWriteBuffer.prototype.writeBuffer = function( buffer , start = 0 , end = buffer.length ) {
	var byteLength = end - start ;
	this.ensureBytes( byteLength ) ;
	buffer.copy( this.buffer , this.ptr , start , end ) ;
	this.ptr += byteLength ;
} ;



SequentialWriteBuffer.prototype.writeFloat =
SequentialWriteBuffer.prototype.writeFloatBE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeFloatBE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

SequentialWriteBuffer.prototype.writeFloatLE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeFloatLE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



SequentialWriteBuffer.prototype.writeNumber =
SequentialWriteBuffer.prototype.writeDouble =
SequentialWriteBuffer.prototype.writeDoubleBE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeDoubleBE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

SequentialWriteBuffer.prototype.writeDoubleLE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeDoubleLE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



SequentialWriteBuffer.prototype.writeUInt8 = function( v ) {
	this.ensureBytes( 1 ) ;
	this.buffer.writeUInt8( v , this.ptr ) ;
	this.ptr ++ ;
} ;



SequentialWriteBuffer.prototype.writeUInt16 =
SequentialWriteBuffer.prototype.writeUInt16BE = function( v ) {
	this.ensureBytes( 2 ) ;
	this.buffer.writeUInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;

SequentialWriteBuffer.prototype.writeUInt16LE = function( v ) {
	this.ensureBytes( 2 ) ;
	this.buffer.writeUInt16LE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



SequentialWriteBuffer.prototype.writeUInt32 =
SequentialWriteBuffer.prototype.writeUInt32BE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeUInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

SequentialWriteBuffer.prototype.writeUInt32LE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeUInt32LE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



SequentialWriteBuffer.prototype.writeUInt64 =
SequentialWriteBuffer.prototype.writeUInt64BE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeBigUInt64BE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

SequentialWriteBuffer.prototype.writeUInt64LE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeBigUInt64LE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



SequentialWriteBuffer.prototype.writeInt8 = function( v ) {
	this.ensureBytes( 1 ) ;
	this.buffer.writeInt8( v , this.ptr ) ;
	this.ptr ++ ;
} ;



SequentialWriteBuffer.prototype.writeInt16 =
SequentialWriteBuffer.prototype.writeInt16BE = function( v ) {
	this.ensureBytes( 2 ) ;
	this.buffer.writeInt16BE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;

SequentialWriteBuffer.prototype.writeInt16LE = function( v ) {
	this.ensureBytes( 2 ) ;
	this.buffer.writeInt16LE( v , this.ptr ) ;
	this.ptr += 2 ;
} ;



SequentialWriteBuffer.prototype.writeInt32 =
SequentialWriteBuffer.prototype.writeInt32BE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeInt32BE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;

SequentialWriteBuffer.prototype.writeInt32LE = function( v ) {
	this.ensureBytes( 4 ) ;
	this.buffer.writeInt32LE( v , this.ptr ) ;
	this.ptr += 4 ;
} ;



SequentialWriteBuffer.prototype.writeInt64 =
SequentialWriteBuffer.prototype.writeInt64BE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeBigInt64BE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;

SequentialWriteBuffer.prototype.writeInt64LE = function( v ) {
	this.ensureBytes( 8 ) ;
	this.buffer.writeBigInt64LE( v , this.ptr ) ;
	this.ptr += 8 ;
} ;



SequentialWriteBuffer.prototype.writeString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	this.ensureBytes( byteLength ) ;
	this.buffer.write( v , this.ptr , byteLength , encoding ) ;
	this.ptr += byteLength ;
} ;

SequentialWriteBuffer.prototype.writeUtf8 = function( v , byteLength ) { return this.writeString( v , byteLength , 'utf8' ) ; } ;



// LPS: Length prefixed string.
// Store the UTF8 BYTE LENGTH using an UInt8.
// Computing byteLength is probably costly, so if the upper layer know it, it can saves some cycles
SequentialWriteBuffer.prototype.writeLps8String = function( v , byteLength , encoding = 'latin1' ) {
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

SequentialWriteBuffer.prototype.writeLps8Utf8 = function( v , byteLength ) { return this.writeLps8String( v , byteLength , 'utf8' ) ; } ;


SequentialWriteBuffer.prototype.writeLps16String =
SequentialWriteBuffer.prototype.writeLps16BEString = function( v , byteLength , encoding = 'latin1' ) {
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

SequentialWriteBuffer.prototype.writeLps16Utf8 = SequentialWriteBuffer.prototype.writeLps16BEUtf8 = function( v , byteLength ) { return this.writeLps16String( v , byteLength , 'utf8' ) ; } ;

SequentialWriteBuffer.prototype.writeLps16LEString = function( v , byteLength , encoding = 'latin1' ) {
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

SequentialWriteBuffer.prototype.writeLps16LEUtf8 = function( v , byteLength ) { return this.writeLps16LEString( v , byteLength , 'utf8' ) ; } ;



SequentialWriteBuffer.prototype.writeLps32String =
SequentialWriteBuffer.prototype.writeLps32BEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	// Write the LPS
	this.writeUInt32( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

SequentialWriteBuffer.prototype.writeLps32Utf8 = SequentialWriteBuffer.prototype.writeLps32BEUtf8 = function( v , byteLength ) { return this.writeLps32String( v , byteLength , 'utf8' ) ; } ;

SequentialWriteBuffer.prototype.writeLps32LEString = function( v , byteLength , encoding = 'latin1' ) {
	if ( byteLength === undefined ) {
		byteLength = Buffer.byteLength( v , encoding ) ;
	}

	// Write the LPS
	this.writeUInt32LE( byteLength ) ;
	this.writeString( v , byteLength , encoding ) ;
} ;

SequentialWriteBuffer.prototype.writeLps32LEUtf8 = function( v , byteLength ) { return this.writeLps32LEString( v , byteLength , 'utf8' ) ; } ;



SequentialWriteBuffer.prototype.writeNullTerminatedString = function( v , encoding = 'latin1' ) {
	if ( v.includes( '\x00' ) ) {
		throw new Error( "The string already contains the NUL character, which is forbidden inside a null-terminated string" ) ;
	}

	v += '\x00' ;
	var byteLength = Buffer.byteLength( v , encoding ) ;

	this.ensureBytes( byteLength ) ;
	this.buffer.write( v , this.ptr , byteLength , encoding ) ;
	this.ptr += byteLength ;
} ;

SequentialWriteBuffer.prototype.writeNullTerminatedUtf8 = function( v ) { return this.writeNullTerminatedString( v , 'utf8' ) ; } ;



SequentialWriteBuffer.prototype.writeLps8Buffer = function( v ) {
	if ( v.length > 255 ) { throw new RangeError( 'The buffer exceed the LPS 8 bits limit' ) ; }
	this.writeUInt8( v.length ) ;
	this.writeBuffer( v ) ;
} ;



SequentialWriteBuffer.prototype.writeLps16Buffer =
SequentialWriteBuffer.prototype.writeLps16BEBuffer = function( v ) {
	if ( v.length > 65535 ) { throw new RangeError( 'The buffer exceed the LPS 16 bits limit' ) ; }
	this.writeUInt16( v.length ) ;
	this.writeBuffer( v ) ;
} ;

SequentialWriteBuffer.prototype.writeLps16LEBuffer = function( v ) {
	if ( v.length > 65535 ) { throw new RangeError( 'The buffer exceed the LPS 16 bits limit' ) ; }
	this.writeUInt16LE( v.length ) ;
	this.writeBuffer( v ) ;
} ;



SequentialWriteBuffer.prototype.writeLps32Buffer =
SequentialWriteBuffer.prototype.writeLps32BEBuffer = function( v ) {
	this.writeUInt32( v.length ) ;
	this.writeBuffer( v ) ;
} ;

SequentialWriteBuffer.prototype.writeLps32LEBuffer = function( v ) {
	this.writeUInt32LE( v.length ) ;
	this.writeBuffer( v ) ;
} ;



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



// Write unsigned bits
SequentialWriteBuffer.prototype.writeUBits =
SequentialWriteBuffer.prototype.writeUBitsBE = function( v , bitCount ) {
	if ( bitCount > 8 || bitCount < 1 ) {
		throw new Error( "SequentialWriteBuffer#writeUBits() expecting bitCount to be between 1 and 8 but got: " + bitCount ) ;
	}

	v &= COUNT_BIT_MASK[ bitCount ] ;

	if ( ! this.remainingBits ) {
		// Use a new byte, and since we write at most 8 bits, we are good to go
		this.ensureBytes( 1 ) ;		// reset currentBitByte and remainingBits
		this.currentBitByte = v << 8 - bitCount ;
		this.remainingBits = 8 - bitCount ;
		this.buffer.writeUInt8( this.currentBitByte , this.ptr ) ;
		this.ptr ++ ;
		return ;
	}

	if ( bitCount <= this.remainingBits ) {
		// Enough bits in the current byte
		this.currentBitByte |= v << this.remainingBits - bitCount ;
		this.remainingBits -= bitCount ;
		this.buffer.writeUInt8( this.currentBitByte , this.ptr - 1 ) ;	// Write on the previous byte
		return ;
	}

	// Split in two parts
	let bitCountLeftOver = bitCount - this.remainingBits ;
	let leftV = v >> bitCountLeftOver ;
	let rightV = v & COUNT_BIT_MASK[ bitCountLeftOver ] ;

	this.currentBitByte |= leftV ;
	this.buffer.writeUInt8( this.currentBitByte , this.ptr - 1 ) ;	// Write on the previous byte

	this.ensureBytes( 1 ) ;		// reset currentBitByte and remainingBits
	this.currentBitByte = rightV << 8 - bitCountLeftOver ;
	this.remainingBits = 8 - bitCountLeftOver ;
	this.buffer.writeUInt8( this.currentBitByte , this.ptr ) ;
	this.ptr ++ ;
} ;

