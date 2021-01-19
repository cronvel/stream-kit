/*
	Stream Kit

	Copyright (c) 2016 - 2021 Cédric Ronvel

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



describe( "WritableToBuffer" , () => {
	
	it( "should bufferize any write" , () => {
		var writable = new streamKit.WritableToBuffer() ;
		
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



describe( "readBufferBits() / writeBufferBits()" , () => {
	
	it( "read bits in the first byte" , () => {
		var buffer = Buffer.alloc( 16 ) ;
		buffer[ 0 ] = 0b00101101 ;
		
		// Read 1 bit
		expect( streamKit.readBufferBits( buffer , 0 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 1 , 1 ) ).to.be( 0 ) ;
		expect( streamKit.readBufferBits( buffer , 2 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 3 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 4 , 1 ) ).to.be( 0 ) ;
		expect( streamKit.readBufferBits( buffer , 5 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 6 , 1 ) ).to.be( 0 ) ;
		expect( streamKit.readBufferBits( buffer , 7 , 1 ) ).to.be( 0 ) ;

		// Read 2 bits
		expect( streamKit.readBufferBits( buffer , 0 , 2 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 1 , 2 ) ).to.be( 2 ) ;
		expect( streamKit.readBufferBits( buffer , 2 , 2 ) ).to.be( 3 ) ;
		expect( streamKit.readBufferBits( buffer , 3 , 2 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 4 , 2 ) ).to.be( 2 ) ;
		expect( streamKit.readBufferBits( buffer , 5 , 2 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 6 , 2 ) ).to.be( 0 ) ;

		// Read 3 bits
		expect( streamKit.readBufferBits( buffer , 0 , 3 ) ).to.be( 5 ) ;
		expect( streamKit.readBufferBits( buffer , 1 , 3 ) ).to.be( 6 ) ;
		expect( streamKit.readBufferBits( buffer , 2 , 3 ) ).to.be( 3 ) ;
		expect( streamKit.readBufferBits( buffer , 3 , 3 ) ).to.be( 5 ) ;
		expect( streamKit.readBufferBits( buffer , 4 , 3 ) ).to.be( 2 ) ;
		expect( streamKit.readBufferBits( buffer , 5 , 3 ) ).to.be( 1 ) ;

		// Read 4 bits
		expect( streamKit.readBufferBits( buffer , 0 , 4 ) ).to.be( 13 ) ;
		expect( streamKit.readBufferBits( buffer , 1 , 4 ) ).to.be( 6 ) ;
		expect( streamKit.readBufferBits( buffer , 2 , 4 ) ).to.be( 11 ) ;
		expect( streamKit.readBufferBits( buffer , 3 , 4 ) ).to.be( 5 ) ;
		expect( streamKit.readBufferBits( buffer , 4 , 4 ) ).to.be( 2 ) ;

		// Read 6 bits
		expect( streamKit.readBufferBits( buffer , 0 , 6 ) ).to.be( 45 ) ;
		expect( streamKit.readBufferBits( buffer , 1 , 6 ) ).to.be( 22 ) ;
		expect( streamKit.readBufferBits( buffer , 2 , 6 ) ).to.be( 11 ) ;

		// Read 8 bits
		expect( streamKit.readBufferBits( buffer , 0 , 8 ) ).to.be( 45 ) ;
	} ) ;

	it( "read bits across random bytes" , () => {
		var buffer = Buffer.alloc( 16 ) ;
		buffer[ 0 ] = 0b00101101 ;
		buffer[ 1 ] = 0b11100111 ;
		buffer[ 2 ] = 0b01110110 ;
		buffer[ 3 ] = 0b00010101 ;

		// Read 1 bit
		expect( streamKit.readBufferBits( buffer , 8 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 10 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 11 , 1 ) ).to.be( 0 ) ;
		expect( streamKit.readBufferBits( buffer , 16 , 1 ) ).to.be( 0 ) ;
		expect( streamKit.readBufferBits( buffer , 24 , 1 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 26 , 1 ) ).to.be( 1 ) ;

		// Read 2 bits
		expect( streamKit.readBufferBits( buffer , 7 , 2 ) ).to.be( 2 ) ;
		expect( streamKit.readBufferBits( buffer , 15 , 2 ) ).to.be( 1 ) ;
		expect( streamKit.readBufferBits( buffer , 16 , 2 ) ).to.be( 2 ) ;
		expect( streamKit.readBufferBits( buffer , 17 , 2 ) ).to.be( 3 ) ;

		// Read 3 bits
		expect( streamKit.readBufferBits( buffer , 6 , 3 ) ).to.be( 4 ) ;
		expect( streamKit.readBufferBits( buffer , 7 , 3 ) ).to.be( 6 ) ;
		expect( streamKit.readBufferBits( buffer , 8 , 3 ) ).to.be( 7 ) ;

		// Read 4 bits
		expect( streamKit.readBufferBits( buffer , 13 , 4 ) ).to.be( 7 ) ;
		expect( streamKit.readBufferBits( buffer , 14 , 4 ) ).to.be( 11 ) ;
		expect( streamKit.readBufferBits( buffer , 15 , 4 ) ).to.be( 13 ) ;

		// Read 8 bits
		expect( streamKit.readBufferBits( buffer , 8 , 8 ) ).to.be( 231 ) ;
		expect( streamKit.readBufferBits( buffer , 9 , 8 ) ).to.be( 115 ) ;
		expect( streamKit.readBufferBits( buffer , 15 , 8 ) ).to.be( 237 ) ;

		// Read 12 bits
		expect( streamKit.readBufferBits( buffer , 8 , 12 ) ).to.be( 1767 ) ;
		expect( streamKit.readBufferBits( buffer , 12 , 12 ) ).to.be( 1902 ) ;
		
		// Read 12 bits, across 3 bytes
		expect( streamKit.readBufferBits( buffer , 14 , 12 ) ).to.be( 1499 ) ;

		// Read 20 bits, across 4 bytes
		expect( streamKit.readBufferBits( buffer , 6 , 20 ) ).to.be( 383900 ) ;
		expect( streamKit.readBufferBits( buffer , 7 , 20 ) ).to.be( 716238 ) ;
		expect( streamKit.readBufferBits( buffer , 8 , 20 ) ).to.be( 358119 ) ;
		expect( streamKit.readBufferBits( buffer , 12 , 20 ) ).to.be( 87918 ) ;
	} ) ;

	it( "write bits in the first byte" , () => {
		var buffer = Buffer.alloc( 16 ) ;
		expect( buffer[ 0 ] ).to.be( 0 ) ;
		
		// Write 1 bit
		streamKit.writeBufferBits( buffer , 0 , 1 , 1 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00000001 ) ;
		streamKit.writeBufferBits( buffer , 7 , 1 , 1 ) ;
		expect( buffer[ 0 ] ).to.be( 0b10000001 ) ;
		streamKit.writeBufferBits( buffer , 4 , 1 , 1 ) ;
		expect( buffer[ 0 ] ).to.be( 0b10010001 ) ;
		streamKit.writeBufferBits( buffer , 4 , 1 , 0 ) ;
		expect( buffer[ 0 ] ).to.be( 0b10000001 ) ;

		// Write multiple bits
		buffer[ 0 ] = 0 ;
		streamKit.writeBufferBits( buffer , 2 , 4 , 0b1010 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00101000 ) ;
		streamKit.writeBufferBits( buffer , 2 , 4 , 0b1111 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00111100 ) ;
		streamKit.writeBufferBits( buffer , 2 , 4 , 0b0000 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00000000 ) ;
		streamKit.writeBufferBits( buffer , 2 , 4 , 0b1111 ) ;
		streamKit.writeBufferBits( buffer , 2 , 4 , 0b0101 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00010100 ) ;
		streamKit.writeBufferBits( buffer , 0 , 4 , 0b1001 ) ;
		expect( buffer[ 0 ] ).to.be( 0b00011001 ) ;
		streamKit.writeBufferBits( buffer , 4 , 4 , 0b1101 ) ;
		expect( buffer[ 0 ] ).to.be( 0b11011001 ) ;
		streamKit.writeBufferBits( buffer , 0 , 8 , 0b01100110 ) ;
		expect( buffer[ 0 ] ).to.be( 0b01100110 ) ;
	} ) ;

	it( "write bits across random bytes" , () => {
		var buffer = Buffer.alloc( 16 ) ;
		
		// Across 2 bytes
		streamKit.writeBufferBits( buffer , 4 , 8 , 0b10111111 ) ;
		expect( buffer[ 0 ] ).to.be( 0b11110000 ) ;
		expect( buffer[ 1 ] ).to.be( 0b00001011 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b0000101111110000 ) ;
		streamKit.writeBufferBits( buffer , 4 , 8 , 0b00110111 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b0000001101110000 ) ;
		streamKit.writeBufferBits( buffer , 0 , 10 , 0b1110001100 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b0000001110001100 ) ;
		streamKit.writeBufferBits( buffer , 6 , 10 , 0b1010001001 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b1010001001001100 ) ;

		// Across 3 bytes or more
		streamKit.writeBufferBits( buffer , 4 , 16 , 0b1010001001111101 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b000010100010011111011100 ) ;
		streamKit.writeBufferBits( buffer , 4 , 20 , 0b10001010001001111101 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b100010100010011111011100 ) ;
		streamKit.writeBufferBits( buffer , 4 , 20 , 0b10001010001001000001 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b100010100010010000011100 ) ;
		streamKit.writeBufferBits( buffer , 12 , 20 , 0b10001010001001000001 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b10001010001001000001010000011100 ) ;
		streamKit.writeBufferBits( buffer , 12 , 16 , 0b1111111111111111 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b10001111111111111111010000011100 ) ;
		streamKit.writeBufferBits( buffer , 0 , 16 , 0b1000000000000001 ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b10001111111111111000000000000001 ) ;
	} ) ;
} ) ;

