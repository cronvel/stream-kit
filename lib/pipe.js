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
	/!\ MAYBE DEPRECATED /!\

	Use new node built-in stream.pipeline() instead?
	But stream.pipeline() forces a destination and a callback... So?
*/

/*
	Better pipe: it forwards errors.
*/

module.exports = function pipe( ... streams ) {
	if ( ! streams.length ) { return ; }

	if ( Array.isArray( streams[ 0 ] ) ) {
		streams = streams[ 0 ] ;
		if ( ! streams.length ) { return ; }
	}

	var lastStream = streams[ streams.length - 1 ] ;

	for ( let i = 1 ; i < streams.length ; i ++ ) {
		//pipeOne( streams[ i - 1 ] , streams[ i ] , lastStream , i - 1 ) ;
		streams[ i - 1 ].pipe( streams[ i ] ) ;
		inputError( streams , i - 1 ) ;
	}

	return lastStream ;
} ;



function inputError( streams , index ) {
	var inputStream = streams[ index ] ,
		lastStream = streams[ streams.length - 1 ] ;

	inputStream.on( 'error' , error => {
		// re-emit the error immediately on the last stream
		lastStream.emit( 'error' , error ) ;
		// immediately destroy all streams
		streams.forEach( stream => stream.destroy() ) ;
	} ) ;
}

