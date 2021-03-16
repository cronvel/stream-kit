/*
	JsPak

	Copyright (c) 2020 Cédric Ronvel

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



const stream = require( 'stream' ) ;
const crypto = require( 'crypto' ) ;



function HashStream( algo = 'sha256' , expectedHash = null ) {
	stream.Transform.call( this ) ;
	this.expectedHash = expectedHash ;
	this.hash = null ;
	this.cryptoHash = crypto.createHash( algo ) ;
}

HashStream.prototype = Object.create( stream.Transform.prototype ) ;
HashStream.prototype.constructor = HashStream ;

module.exports = HashStream ;



HashStream.prototype._transform = function( buffer , encoding , callback ) {
	this.cryptoHash.update( buffer ) ;
	// Pass through
	this.push( buffer ) ;
	callback() ;
} ;



HashStream.prototype._flush = function( callback ) {
	this.hash = this.cryptoHash.digest( 'hex' ) ;

	if ( this.expectedHash && this.expectedHash !== this.hash ) {
		let error = new Error( "HashStream: expecting hash '" + this.expectedHash + "' but got '" + this.hash + "'." ) ;
		error.code = 'badHash' ;
		callback( error ) ;
		return ;
	}

	callback() ;
} ;

