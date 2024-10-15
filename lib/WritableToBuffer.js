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
	This produces a Writable Stream that bufferize anything written on it.
*/

const Writable = require( 'stream' ).Writable ;

class WritableToBuffer extends Writable {
	chunkSize ;
	chunkSizeMultiplier ;
	buffer ;
	ptr ;
	chunks ;
	allChunksSize ;



	constructor( options = {} ) {
		super( options ) ;

		this.chunkSize = options.chunkSize || 1024 ;
		this.chunkSizeMultiplier = options.chunkSizeMultiplier || 1.5 ;
		this.buffer = new Buffer.alloc( this.chunkSize ) ;
		this.ptr = 0 ;
		this.chunks = [] ;
		this.allChunksSize = 0 ;
	}



	// Mostly copied from SequentialWriteBuffer#writeBuffer()
	_write( chunk , encoding , callback ) {
		if ( ! Buffer.isBuffer( chunk ) ) {
			callback( new TypeError( "WritableToBuffer: _write() called with a non-buffer" ) ) ;
			return ;
		}

		this.ensureBytes( chunk.length ) ;
		chunk.copy( this.buffer , this.ptr ) ;
		this.ptr += chunk.length ;
		callback() ;
	}



	// Copy from SequentialWriteBuffer#ensureBytes()
	ensureBytes( byteLength ) {
		if ( byteLength <= this.buffer.length - this.ptr ) { return ; }

		this.chunks.push( this.buffer.slice( 0 , this.ptr ) ) ;
		this.allChunksSize += this.ptr ;

		// The next chunk wil be larger, to avoid allocation of too much buffers,
		// it also should at least be large enough for the next write.
		this.chunkSize = Math.ceil( Math.max( byteLength , this.chunkSize * this.chunkSizeMultiplier ) ) ;

		this.buffer = Buffer.allocUnsafe( this.chunkSize ) ;
		this.ptr = 0 ;
	}



	// Copy from SequentialWriteBuffer#getBuffer()
	getBuffer() {
		if ( ! this.ptr ) { return Buffer.concat( this.chunks ) ; }
		return Buffer.concat( [ ... this.chunks , this.buffer.slice( 0 , this.ptr ) ] ) ;
	}
	// Backward compatibility
	get() { return this.getBuffer() ; }

	// Copy from SequentialWriteBuffer#size()
	size() { return this.allChunksSize + this.ptr ; }
}

module.exports = WritableToBuffer ;

