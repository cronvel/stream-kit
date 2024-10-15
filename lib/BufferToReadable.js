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



/*
	This produces a Readable Stream which emit data from.
	Mainly for debugging purpose.
*/

const Readable = require( 'stream' ).Readable ;

class BufferToReadable extends Readable {
	constructor( buffer , options = {} ) {
		super( options ) ;

		this.buffer = buffer ;
		this.chunkSize = options.chunkSize || 16 * 1024 ;
		this.ptr = 0 ;
	}

	_read( size = this.chunkSize ) {
		if ( this.ptr >= this.buffer.length ) {
			this.push( null ) ;
			return ;
		}

		size = Math.min( size , this.buffer.length - this.ptr ) ;

		if ( size ) {
			this.push( this.buffer.slice( this.ptr , this.ptr + size ) ) ;
			this.ptr += size ;
		}
	}
}

module.exports = BufferToReadable ;

