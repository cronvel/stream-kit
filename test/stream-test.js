/*
	Stream Kit

	Copyright (c) 2016 - 2020 Cédric Ronvel

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

/* global describe, it, before, after */

"use strict" ;



const streamKit = require( '..' ) ;
//const fs = require( 'fs' ) ;



describe( "FakeWritable" , () => {
	
	it( "should bufferize any write" , () => {
		var writable = new streamKit.FakeWritable() ;
		
		writable.write( "bob" ) ;
		expect( writable.get().toString() ).to.be( "bob" ) ;
		expect( writable.buffer.length ).to.be( 1024 ) ;
		
		writable.write( "bob" ) ;
		expect( writable.get().toString() ).to.be( "bobbob" ) ;
		
		writable.write( "jack" ) ;
		expect( writable.get().toString() ).to.be( "bobbobjack" ) ;
		
		// Force a buffer reallocation
		writable.write( Buffer.alloc( 1024 , 'a'.charCodeAt(0) ) ) ;
		expect( writable.dataSize ).to.be( 1034 ) ;
		expect( writable.get().toString() ).to.be( "bobbobjack" + 'a'.repeat( 1024 ) ) ;
		expect( writable.buffer.length ).to.be( 2048 ) ;
	} ) ;
} ) ;

