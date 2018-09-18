/*
	Stream Kit

	Copyright (c) 2016 - 2018 Cédric Ronvel

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
	This produce a Writable Stream that bufferize anything written on it.
	Mainly for debugging purpose.
*/

const Writable = require( 'stream' ).Writable ;

class FakeWritable extends Writable {
	constructor( options = {} ) {
		super( options ) ;
		this.buffer = new Buffer.alloc( 1024 ) ;
		this.dataSize = 0 ;
	}

	_write( chunk , encoding , callback ) {
		var oldBuffer ;

		if ( ! Buffer.isBuffer( chunk ) ) {
			callback( 'error' , new TypeError( "FakeWritable: _write() called with a non-buffer" ) ) ;
			return ;
		}

		var newDataSize = this.dataSize + chunk.length ;

		if ( newDataSize > this.buffer.length ) {
			// The internal buffer need resizing...
			oldBuffer = this.buffer ;

			// This allocate the next power of two after (newDataSize * 1.5)
			this.buffer = Buffer.alloc( 1 << 32 - Math.clz32( newDataSize * 1.5 ) ) ;
			oldBuffer.copy( this.buffer ) ;
		}

		chunk.copy( this.buffer , this.dataSize ) ;
		this.dataSize = newDataSize ;
		callback() ;
	}

	get() {
		return this.buffer.slice( 0 , this.dataSize ) ;
	}
}

module.exports = FakeWritable ;

