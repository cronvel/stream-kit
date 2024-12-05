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



const Duplex = require( 'stream' ).Duplex ;
const StreamBuffer = require( './StreamBuffer.js' ) ;



/*
	This produces a Duplex (hence Readable) Stream which generate data from a Javascript Generator function.
	It is baked by a StreamBuffer that write to the duplex stream.
*/

class ReadableGenerator extends Duplex {
	constructor( generator , size = 1024 , duplexOptions = {} ) {
		super( duplexOptions ) ;
		this.generator = generator ;
		this.streamBuffer = new StreamBuffer( this , size ) ;
		this.iterator = this.generator( this.streamBuffer ) ;
	}
	
	_write( chunk , encoding , callback ) {
		// The underlying source only deals with strings.
		//if (Buffer.isBuffer(chunk)) { chunk = chunk.toString(); }
		this[kSource].writeSomeData(chunk);
		callback();
	}
	
	_read( /*size*/ ) {
		try {

		console.log( "_read() called" ) ;
		var next = this.iterator.next() ;
		if ( next.done ) {
			console.log( "_read() iterator done" ) ;
			this.push( null ) ;
			return ;
		}

		var data = next.value ;
		console.log( "Fetched data:" , data ) ;
		this.push( data ) ;

		} catch ( error ) { console.error( "_read() Error:" , error ) ; }
	}
}

module.exports = ReadableGenerator ;

