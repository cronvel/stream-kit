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



// Bring all the good stuffs of StreamBuffer to regular buffer.



function SequentialReadBuffer( buffer ) {
	this.buffer = buffer ;
	this.ptr = 0 ;
}

module.exports = SequentialReadBuffer ;



SequentialReadBuffer.prototype.ended = function() { return this.ptr >= this.buffer.length ; } ;
SequentialReadBuffer.prototype.remainingBytes = function() { return this.buffer.length - this.ptr ; } ;



SequentialReadBuffer.prototype.readBuffer = function( byteLength ) {
	var buffer = Buffer.allocUnsafe( byteLength ) ;
	this.buffer.copy( buffer , 0 , this.ptr , this.ptr + byteLength ) ;
	this.ptr += byteLength ;
	return buffer ;
} ;



SequentialReadBuffer.prototype.readFloat =
SequentialReadBuffer.prototype.readFloatBE = function() {
	var v = this.buffer.readFloatBE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readFloatLE = function() {
	var v = this.buffer.readFloatLE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readNumber =
SequentialReadBuffer.prototype.readDouble =
SequentialReadBuffer.prototype.readDoubleBE = function() {
	var v = this.buffer.readDoubleBE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readDoubleLE = function() {
	var v = this.buffer.readDoubleLE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt8 = function() {
	return this.buffer.readUInt8( this.ptr ++ ) ;
} ;



SequentialReadBuffer.prototype.readUInt16 =
SequentialReadBuffer.prototype.readUInt16BE = function() {
	var v = this.buffer.readUInt16BE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt16LE = function() {
	var v = this.buffer.readUInt16LE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt32 =
SequentialReadBuffer.prototype.readUInt32BE = function() {
	var v = this.buffer.readUInt32BE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt32LE = function() {
	var v = this.buffer.readUInt32LE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUInt64 =
SequentialReadBuffer.prototype.readUInt64BE = function() {
	var v = this.buffer.readBigUInt64BE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readUInt64LE = function() {
	var v = this.buffer.readBigUInt64LE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt8 = function() {
	return this.buffer.readInt8( this.ptr ++ ) ;
} ;



SequentialReadBuffer.prototype.readInt16 =
SequentialReadBuffer.prototype.readInt16BE = function() {
	var v = this.buffer.readInt16BE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt16LE = function() {
	var v = this.buffer.readInt16LE( this.ptr ) ;
	this.ptr += 2 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt32 =
SequentialReadBuffer.prototype.readInt32BE = function() {
	var v = this.buffer.readInt32BE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt32LE = function() {
	var v = this.buffer.readInt32LE( this.ptr ) ;
	this.ptr += 4 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readInt64 =
SequentialReadBuffer.prototype.readInt64BE = function() {
	var v = this.buffer.readBigInt64BE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;

SequentialReadBuffer.prototype.readInt64LE = function() {
	var v = this.buffer.readBigInt64LE( this.ptr ) ;
	this.ptr += 8 ;
	return v ;
} ;



SequentialReadBuffer.prototype.readUtf8 = function( byteLength ) {
	var v = this.buffer.toString( 'utf8' , this.ptr , this.ptr + byteLength ) ;
	this.ptr += byteLength ;
	return v ;
} ;



// LPS: Length Prefixed String.
// Read the UTF8 BYTE LENGTH using an UInt8.
SequentialReadBuffer.prototype.readLps8Utf8 = function() {
	// Read the LPS
	var byteLength = this.readUInt8() ;
	return this.readUtf8( byteLength ) ;
} ;



SequentialReadBuffer.prototype.readLps16Utf8 =
SequentialReadBuffer.prototype.readLps16BEUtf8 = function() {
	// Read the LPS
	var byteLength = this.readUInt16() ;
	return this.readUtf8( byteLength ) ;
} ;

SequentialReadBuffer.prototype.readLps16LEUtf8 = function() {
	// Read the LPS
	var byteLength = this.readUInt16LE() ;
	return this.readUtf8( byteLength ) ;
} ;



SequentialReadBuffer.prototype.readLps32Utf8 =
SequentialReadBuffer.prototype.readLps32BEUtf8 = function() {
	// Read the LPS
	var byteLength = this.readUInt32() ;
	return this.readUtf8( byteLength ) ;
} ;

SequentialReadBuffer.prototype.readLps32LEUtf8 = function() {
	// Read the LPS
	var byteLength = this.readUInt32LE() ;
	return this.readUtf8( byteLength ) ;
} ;



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

