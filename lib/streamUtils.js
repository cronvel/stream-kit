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



// Just get all the stream into a string, up to a byte limit
exports.getFullString = ( stream , maxBytes = 1024000 ) => {
	return new Promise( ( resolve , reject ) => {
		var finished = false , data = '' , bytes = 0 ;

		var finish = error => {
			if ( finished ) { return ; }
			finished = true ;
			stream.removeListener( 'data' , onData ) ;

			if ( error ) { reject( error ) ; }
			else { resolve( data ) ; }
		} ;

		var onData = chunk => {
			bytes += chunk.length ;

			if ( bytes > maxBytes ) {
				finish( new Error( 'Too large' ) ) ;
				return ;
			}

			data += chunk.toString() ;
		} ;

		stream.on( 'data' , onData ) ;
		stream.once( 'end' , () => finish() ) ;
	} ) ;
} ;

