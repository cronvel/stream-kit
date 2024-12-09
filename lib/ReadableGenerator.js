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

	Arguments:
		generator: a generator or async generator function
		options: object of options, where:
			streamBufferSize: the size in bytes for the underlying StreamBuffer instance's buffer
			prefetchSize: the size in bytes of the data that should be prefetched so calling .read() will be faster
		duplexOptions: options passed to Node.js stream.Duplex's constructor
*/

class ReadableGenerator extends Duplex {
	constructor( generator , options = {} , duplexOptions = {} ) {
		super( duplexOptions ) ;

		this.generator = generator ;
		this.streamBuffer = new StreamBuffer( this , options.streamBufferSize || undefined ) ;
		this.iterator = this.generator( this.streamBuffer ) ;
		this.generatorEnded = false ;
		this.processingNextChunk = false ;
		this.prefetchSize = options.prefetchSize || 0 ;
		this.chunkQueue= [] ;
		this.chunkQueueSize = 0 ;

		if ( this.prefetchSize ) {
			console.log( "\t>>>calling prefetch (constructor())" , this.chunkQueue.length , this.chunkQueueSize && this.generatorEnded , this.streamBuffer.ptr , this.processingNextChunk ) ;
			this.prefetch() ;
		}
	}
	
	_write( chunk , encoding , callback ) {
		this.addToQueue( chunk , encoding ) ;
		callback() ;
	}
	
	addToQueue( chunk , encoding ) {
		if ( ! ( chunk instanceof Buffer ) ) {
			chunk = Buffer.from( chunk , encoding ) ;
		}

		this.chunkQueue.push( chunk ) ;
		this.chunkQueueSize += chunk.length ;
	}
	
	async _read() {
		console.log( "_read() called" ) ;
		while ( ! this.chunkQueue.length ) {
			//console.log( "_read() loop" , this.chunkQueue.length , this.generatorEnded , this.streamBuffer.ptr , this.processingNextChunk ) ;
			if ( this.generatorEnded ) {
				if ( this.streamBuffer.ptr ) {
					await this.streamBuffer.flush() ;
				}
				else {
					console.log( "_read() pushed NULL" ) ;
					this.push( null ) ;
					return ;
				}
			}
			else {
				await this.getNextChunk() ;
			}
		}

		var chunk = this.chunkQueue.shift() ;
		this.chunkQueueSize -= chunk.length ;

		if ( ! this.generatorEnded && this.chunkQueueSize < this.prefetchSize ) {
			console.log( "\t>>>calling prefetch (_read())" , this.chunkQueue.length , this.chunkQueueSize && this.generatorEnded , this.streamBuffer.ptr , this.processingNextChunk ) ;
			this.prefetch() ;
		}

		this.push( chunk ) ;
	}

	async prefetch() {
		console.log( "prefetch() called" ) ;
		while ( ! this.generatorEnded && this.chunkQueueSize < this.prefetchSize ) {
			await this.getNextChunk() ;
		}
	}

	async getNextChunk() {
		if ( this.processingNextChunk ) { return ; }
		this.processingNextChunk = true ;

		console.log( "getNextChunk() called" ) ;
		var next = await this.iterator.next() ;
		console.log( "getNextChunk() next:" , next ) ;

		if ( next.done ) {
			console.log( "getNextChunk() iterator done" ) ;
			await this.streamBuffer.flush() ;
			this.generatorEnded = true ;
			this.processingNextChunk = false ;
			console.log( "getNextChunk() iterator done OK" ) ;
			return ;
		}

		console.log( "Fetched data:" , JSON.stringify( next.value ) ) ;
		if ( ! next.value ) {
			this.processingNextChunk = false ;
			return ;
		}

		// Prevent bad things from happening when mixing generator direct response and StreamBuffer write
		// (bad practice, but we still need to prevent bugs)
		if ( this.streamBuffer.ptr ) { await this.streamBuffer.flush() ; }

		this.addToQueue( next.value ) ;
		this.processingNextChunk = false ;
	}
}

module.exports = ReadableGenerator ;

