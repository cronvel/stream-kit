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



function SequentialReadBuffer( buffer ) {
	this.buffer = buffer ;
	this.ptr = 0 ;

	// Bit reading part
	this.currentBitByte = 0 ;       // current byte where to extract bits
	this.remainingBits = 0 ;    // remaining bits inside the current byte, if 0 there is no byte where to extract bits
}

module.exports = SequentialReadBuffer ;



// Getters
Object.defineProperties( SequentialReadBuffer.prototype , {
	ended: {
		get: function() { return this.ptr >= this.buffer.length ; }
	} ,
	remainingBytes: {
		get: function() { return this.buffer.length - this.ptr ; }
	}
} ) ;



// Skip some bytes we don't have interest in
SequentialReadBuffer.prototype.skip = function( byteLength ) {
	this.remainingBits = this.currentBitByte = 0 ;
	this.ptr += byteLength ;
} ;



SequentialReadBuffer.prototype.readBuffer = function( byteLength , view = false ) {
	this.remainingBits = this.currentBitByte = 0 ;
	var buffer ;

	if ( view ) {
		buffer = this.buffer.slice( this.ptr , this.ptr + byteLength ) ;
	}
	else {
		buffer = Buffer.allocUnsafe( byteLength ) ;
		this.buffer.copy( buffer , 0 , this.ptr , this.ptr + byteLength ) ;
	}

	this.ptr += byteLength ;
	return buffer ;
} ;



SequentialReadBuffer.prototype.readFloat =
SequentialReadBuffer.prototype.readFloatBE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readFloatBE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readFloatLE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readFloatLE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readNumber =
SequentialReadBuffer.prototype.readDouble =
SequentialReadBuffer.prototype.readDoubleBE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readDoubleBE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readDoubleLE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readDoubleLE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt8 = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	return this.buffer.readUInt8( this.ptr ++ ) ;
} ;



SequentialReadBuffer.prototype.readUInt16 =
SequentialReadBuffer.prototype.readUInt16BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readUInt16BE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt16LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readUInt16LE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt32 =
SequentialReadBuffer.prototype.readUInt32BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readUInt32BE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt32LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readUInt32LE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt64 =
SequentialReadBuffer.prototype.readUInt64BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readBigUInt64BE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt64LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readBigUInt64LE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt8 = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	return this.buffer.readInt8( this.ptr ++ ) ;
} ;



SequentialReadBuffer.prototype.readInt16 =
SequentialReadBuffer.prototype.readInt16BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readInt16BE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt16LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readInt16LE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt32 =
SequentialReadBuffer.prototype.readInt32BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readInt32BE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt32LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readInt32LE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt64 =
SequentialReadBuffer.prototype.readInt64BE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readBigInt64BE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt64LE = function() {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.readBigInt64LE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readString = function( byteLength , encoding = 'latin1' ) {
	this.remainingBits = this.currentBitByte = 0 ;
	var v = this.buffer.toString( encoding , this.ptr , this.ptr + byteLength ) ;
	this.ptr += byteLength ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUtf8 = function( byteLength ) { return this.readString( byteLength , 'utf8' ) ; } ;



// LPS: Length Prefixed String.
// Read the UTF8 BYTE LENGTH using an UInt8.
SequentialReadBuffer.prototype.readLps8String = function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = this.readUInt8() ;
	return this.readString( byteLength , encoding ) ;
} ;

SequentialReadBuffer.prototype.readLps8Utf8 = function() { return this.readLps8String( 'utf8' ) ; } ;



SequentialReadBuffer.prototype.readLps16String =
SequentialReadBuffer.prototype.readLps16BEString = function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = this.readUInt16() ;
	return this.readString( byteLength , encoding ) ;
} ;

SequentialReadBuffer.prototype.readLps16Utf8 = SequentialReadBuffer.prototype.readLps16BEUtf8 = function() { return this.readLps16String( 'utf8' ) ; } ;

SequentialReadBuffer.prototype.readLps16LEString = function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = this.readUInt16LE() ;
	return this.readString( byteLength , encoding ) ;
} ;

SequentialReadBuffer.prototype.readLps16LEString = function() { return this.readLps16LEString( 'utf8' ) ; } ;



SequentialReadBuffer.prototype.readLps32String =
SequentialReadBuffer.prototype.readLps32BEString = function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = this.readUInt32() ;
	return this.readString( byteLength , encoding ) ;
} ;

SequentialReadBuffer.prototype.readLps32Utf8 = SequentialReadBuffer.prototype.readLps32BEUtf8 = function() { return this.readLps32String( 'utf8' ) ; } ;

SequentialReadBuffer.prototype.readLps32LEString = function( encoding = 'latin1' ) {
	// Read the LPS
	var byteLength = this.readUInt32LE() ;
	return this.readString( byteLength , encoding ) ;
} ;

SequentialReadBuffer.prototype.readLps32LEString = function() { return this.readLps32LEString( 'utf8' ) ; } ;



// Extract Buffer (copy, non-overlapping memory)

SequentialReadBuffer.prototype.readLps8Buffer = function() {
	var byteLength = this.readUInt8() ;
	return this.readBuffer( byteLength ) ;
} ;



SequentialReadBuffer.prototype.readLps16Buffer =
SequentialReadBuffer.prototype.readLps16BEBuffer = function() {
	var byteLength = this.readUInt16() ;
	return this.readBuffer( byteLength ) ;
} ;

SequentialReadBuffer.prototype.readLps16LEBuffer = function() {
	var byteLength = this.readUInt16LE() ;
	return this.readBuffer( byteLength ) ;
} ;



SequentialReadBuffer.prototype.readLps32Buffer =
SequentialReadBuffer.prototype.readLps32BEBuffer = function() {
	var byteLength = this.readUInt32() ;
	return this.readBuffer( byteLength ) ;
} ;

SequentialReadBuffer.prototype.readLps32LEBuffer = function() {
	var byteLength = this.readUInt32LE() ;
	return this.readBuffer( byteLength ) ;
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



// Read unsigned bits
SequentialReadBuffer.prototype.readUBits =
SequentialReadBuffer.prototype.readUBitsBE = function( bitCount ) {
	if ( bitCount > 8 || bitCount < 1 ) {
		throw new Error( "SequentialReadBuffer#readUBits() expecting bitCount to be between 1 and 8 but got: " + bitCount ) ;
	}

	if ( ! this.remainingBits ) {
		this.currentBitByte = this.buffer.readUInt8( this.ptr ) ;
		let v = this.currentBitByte >> 8 - bitCount ;
		this.remainingBits = 8 - bitCount ;
		this.ptr ++ ;
		return v ;
	}

	if ( bitCount <= this.remainingBits ) {
		// Enough bits in the current byte
		let v = ( this.currentBitByte >> this.remainingBits - bitCount ) & COUNT_BIT_MASK[ bitCount ] ;
		this.remainingBits -= bitCount ;
		return v ;
	}

	// It's splitted in two parts
	let bitCountLeftOver = bitCount - this.remainingBits ;
	let leftV = ( this.currentBitByte & COUNT_BIT_MASK[ this.remainingBits ] ) << bitCountLeftOver ;

	this.currentBitByte = this.buffer.readUInt8( this.ptr ) ;
	let rightV = this.currentBitByte >> 8 - bitCountLeftOver ;
	this.remainingBits = 8 - bitCountLeftOver ;
	this.ptr ++ ;

	return leftV + rightV ;
} ;

