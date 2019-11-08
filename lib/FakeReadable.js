/*
	Stream Kit

	Copyright (c) 2016 - 2019 Cédric Ronvel

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
	This produce a Readable Stream which emit random data.
	Mainly for debugging purpose.
*/

const Readable = require( 'stream' ).Readable ;

class FakeReadable extends Readable {
	constructor( options = {} ) {
		super( options ) ;

		this.chunkSize = options.chunkSize || 1024 ;
		this.chunkCount = options.chunkCount || 4 ;
		this.timeout = options.timeout || 100 ;
		this.filler = options.filler || null ;
	}

	_read( size ) {
		if ( ! this.chunkCount -- ) {
			this.push( null ) ;
			return ;
		}

		setTimeout( () => {
			var buffer = Buffer.alloc( this.chunkSize , this.filler !== null ? this.filler : Math.floor( Math.random() * 256 ) )  ;
			this.push( buffer ) ;
		} , this.timeout ) ;
	}
}

module.exports = FakeReadable ;

