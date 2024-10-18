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

/* global describe, it, before, after */

"use strict" ;



const streamKit = require( '..' ) ;
//const fs = require( 'fs' ) ;



describe( "SequentialReadBuffer & SequentialWriteBuffer" , () => {
	
	it( "should build a buffer with sequential writes and then read it with sequential reads" , () => {
		var writable = new streamKit.SequentialWriteBuffer() ;
		writable.writeLps8Utf8( "some string" ) ;
		writable.writeUInt8( 42 ) ;
		writable.writeInt8( -7 ) ;
		writable.writeInt16( 489 ) ;
		writable.writeUInt32( 123456 ) ;
		writable.writeLps16Utf8( "and another some string" ) ;
		
		var bufferSize = writable.size() ;
		var buffer = writable.getBuffer() ;

		var readable = new streamKit.SequentialReadBuffer( buffer ) ;
		expect( readable.remainingBytes ).to.be( bufferSize ) ;
		expect( readable.readLps8Utf8() ).to.be( "some string" ) ;
		expect( readable.readUInt8() ).to.be( 42 ) ;
		expect( readable.readInt8() ).to.be( -7 ) ;
		expect( readable.readInt16() ).to.be( 489 ) ;
		expect( readable.readUInt32() ).to.be( 123456 ) ;
		expect( readable.readLps16Utf8() ).to.be( "and another some string" ) ;
		expect( readable.ended ).to.be( true ) ;
		expect( readable.remainingBytes ).to.be( 0 ) ;
	} ) ;
	
	it( "SequentialWriteBuffer should manage ever-growing chunks" , () => {
		var stringPart = "a string!" ,
			stringArray = [] ;

		for ( let i = 0 ; i < 100 ; i ++ ) {
			stringArray[ i ] = stringPart.repeat( 1 + Math.round( 100 * Math.random() ) ) ;
		}

		var writable = new streamKit.SequentialWriteBuffer( 8 ) ;
		for ( let str of stringArray ) {
			writable.writeLps16Utf8( str ) ;
		}

		var bufferSize = writable.size() ;
		var buffer = writable.getBuffer() ;

		var readable = new streamKit.SequentialReadBuffer( buffer ) ;
		expect( readable.remainingBytes ).to.be( bufferSize ) ;
		for ( let str of stringArray ) {
			expect( readable.readLps16Utf8() ).to.be( str ) ;
		}
		expect( readable.ended ).to.be( true ) ;
		expect( readable.remainingBytes ).to.be( 0 ) ;
	} ) ;
	
	it( "should perform sequential bit reads and writes" , () => {
		var writable = new streamKit.SequentialWriteBuffer() ;

		writable.writeUBits( 0b01 , 2 ) ;
		writable.writeUBits( 0b101 , 3 ) ;
		writable.writeUBits( 0b110 , 3 ) ;

		// Overlapping
		writable.writeUBits( 0b1101 , 4 ) ;
		writable.writeUBits( 0b010111 , 6 ) ;
		writable.writeUBits( 0b0100000 , 7 ) ;
		writable.writeUBits( 0b1 , 1 ) ;

		// Reset and realign bit writing by writing byte
		writable.writeUInt8( 42 ) ;
		writable.writeUBits( 0b1 , 1 ) ;
		writable.writeUBits( 0b0 , 1 ) ;
		writable.writeUBits( 0b10011 , 5 ) ;

		// Again
		writable.writeUtf8( "boblol" , 3 ) ;
		writable.writeUBits( 0b01 , 2 ) ;
		writable.writeUBits( 0b10 , 2 ) ;
		
		var bufferSize = writable.size() ;
		var buffer = writable.getBuffer() ;
		//console.log( "Buffer:" , buffer ) ;

		var readable = new streamKit.SequentialReadBuffer( buffer ) ;

		expect( readable.readUBits( 2 ) ).to.be( 0b01 ) ;
		expect( readable.readUBits( 3 ) ).to.be( 0b101 ) ;
		expect( readable.readUBits( 3 ) ).to.be( 0b110 ) ;

		expect( readable.readUBits( 4 ) ).to.be( 0b1101 ) ;
		expect( readable.readUBits( 6 ) ).to.be( 0b010111 ) ;
		expect( readable.readUBits( 7 ) ).to.be( 0b0100000 ) ;
		expect( readable.readUBits( 1 ) ).to.be( 0b1 ) ;

		expect( readable.readUInt8() ).to.be( 42 ) ;
		expect( readable.readUBits( 1 ) ).to.be( 0b1 ) ;
		expect( readable.readUBits( 1 ) ).to.be( 0b0 ) ;
		expect( readable.readUBits( 5 ) ).to.be( 0b10011 ) ;
		
		expect( readable.readUtf8( 3 ) ).to.be( "bob" ) ;
		expect( readable.readUBits( 2 ) ).to.be( 0b01 ) ;
		expect( readable.readUBits( 2 ) ).to.be( 0b10 ) ;

		expect( readable.ended ).to.be( true ) ;
		expect( readable.remainingBytes ).to.be( 0 ) ;
	} ) ;
} ) ;


	
describe( "Cross-class random tests" , () => {

	it( "cross-testing random bit reads and writes, between Sequential*Buffer StreamBuffer instances" , async () => {
		var ops = [] ,
			writableSeqBuffer = new streamKit.SequentialWriteBuffer() ,
			writableBuffer = new streamKit.WritableToBuffer() ,
			writableStreamBuffer = new streamKit.StreamBuffer( writableBuffer ) ;

		for ( let i = 0 ; i < 1000 ; i ++ ) {
			let isBit = Math.random() < 0.8 ;

			if ( isBit ) {
				let count = Math.ceil( 8 * Math.random() ) ;
				let number = Math.floor( ( 1 << count ) * Math.random() ) ;
				ops.push( [ isBit , count , number ] ) ;
				writableSeqBuffer.writeUBits( number , count ) ;
				writableStreamBuffer.writeUBits( number , count ) ;
			}
			else {
				let number = Math.floor( 10000 * Math.random() ) ;
				ops.push( [ isBit , null , number ] ) ;
				writableSeqBuffer.writeUInt16( number ) ;
				writableStreamBuffer.writeUInt16( number ) ;
			}
		}

		// End the stream, it will flush any remaining left-overs, also wait for this to be finished
		await writableStreamBuffer.end() ;
		//console.log( writableBuffer.getBuffer() ) ;

		var buffer = writableSeqBuffer.getBuffer() ,
			readableSeqBuffer = new streamKit.SequentialReadBuffer( buffer ) ,
			readableSeqBuffer2 = new streamKit.SequentialReadBuffer( writableBuffer.getBuffer() ) ,
			readableBuffer = new streamKit.BufferToReadable( buffer ) ,
			readableStreamBuffer = new streamKit.StreamBuffer( readableBuffer ) ;

		for ( let [ isBit , count , expectedNumber ] of ops ) {
			if ( isBit ) {
				expect( readableSeqBuffer.readUBits( count ) ).to.be( expectedNumber ) ;
				expect( await readableStreamBuffer.readUBits( count ) ).to.be( expectedNumber ) ;
				expect( readableSeqBuffer2.readUBits( count ) ).to.be( expectedNumber ) ;
			}
			else {
				expect( readableSeqBuffer.readUInt16() ).to.be( expectedNumber ) ;
				expect( await readableStreamBuffer.readUInt16() ).to.be( expectedNumber ) ;
				expect( readableSeqBuffer2.readUInt16() ).to.be( expectedNumber ) ;
			}
		}

		expect( readableSeqBuffer.ended ).to.be( true ) ;
		expect( readableSeqBuffer.remainingBytes ).to.be( 0 ) ;
	} ) ;

	it( "cross-testing null-terminated strings, between Sequential*Buffer StreamBuffer instances" , async () => {
		var ops = [] ,
			writableSeqBuffer = new streamKit.SequentialWriteBuffer() ,
			writableBuffer = new streamKit.WritableToBuffer() ,
			writableStreamBuffer = new streamKit.StreamBuffer( writableBuffer ) ;

		for ( let i = 0 ; i < 1000 ; i ++ ) {
			//let string = '<' + ( '[' + Math.floor( 1000000 * Math.random() ) + ']' ).repeat( 1 + Math.floor( 20 * Math.random() ) ) + '>' ;
			let string = '<' + ( '[' + i + ']' ).repeat( 1 + Math.floor( 20 * Math.random() ) ) + '>' ;
			ops.push( string ) ;
			writableSeqBuffer.writeNullTerminatedString( string ) ;
			writableStreamBuffer.writeNullTerminatedString( string ) ;
		}

		// End the stream, it will flush any remaining left-overs, also wait for this to be finished
		await writableStreamBuffer.end() ;
		//console.log( "writableBuffer:" , writableBuffer.getBuffer().toString() ) ;

		var buffer = writableSeqBuffer.getBuffer() ,
			readableSeqBuffer = new streamKit.SequentialReadBuffer( buffer ) ,
			readableSeqBuffer2 = new streamKit.SequentialReadBuffer( writableBuffer.getBuffer() ) ,
			readableBuffer = new streamKit.BufferToReadable( buffer ) ,
			readableStreamBuffer = new streamKit.StreamBuffer( readableBuffer ) ;

		for ( let expectedString of ops ) {
			expect( readableSeqBuffer.readNullTerminatedString() ).to.be( expectedString ) ;
			expect( await readableStreamBuffer.readNullTerminatedString() ).to.be( expectedString ) ;
			expect( readableSeqBuffer2.readNullTerminatedString() ).to.be( expectedString ) ;
		}

		expect( readableSeqBuffer.ended ).to.be( true ) ;
		expect( readableSeqBuffer.remainingBytes ).to.be( 0 ) ;
	} ) ;
} ) ;



describe( "WritableToBuffer" , () => {
	
	it( "should bufferize any write" , () => {
		var writable = new streamKit.WritableToBuffer() ;
		
		writable.write( "bob" ) ;
		expect( writable.getBuffer().toString() ).to.be( "bob" ) ;
		
		writable.write( "bob" ) ;
		expect( writable.getBuffer().toString() ).to.be( "bobbob" ) ;
		
		writable.write( "jack" ) ;
		expect( writable.getBuffer().toString() ).to.be( "bobbobjack" ) ;
		
		// Force a buffer reallocation
		writable.write( Buffer.alloc( 1024 , 'a'.charCodeAt(0) ) ) ;
		expect( writable.size() ).to.be( 1034 ) ;
		expect( writable.getBuffer().toString() ).to.be( "bobbobjack" + 'a'.repeat( 1024 ) ) ;
	} ) ;

	it( "should bufferize multiple random writes" , () => {
		var wholeString = '' ,
			writable = new streamKit.WritableToBuffer() ;
		
		for ( let i = 0 ; i < 100 ; i ++ ) {
			let str = '' + Math.round( 1000000 * Math.random() ) ;
			wholeString += str ;
			writable.write( str ) ;
		}

		expect( writable.getBuffer().toString() ).to.be( wholeString ) ;
		expect( writable.size() ).to.be( wholeString.length ) ;
	} ) ;
} ) ;





// DEPRECATED, but still usefull since it performs reading/writing bits in little-endian,
// while buffer method only support big-endian bit reading
describe( "(DEPRECATED) readBufferBits() / writeBufferBits()" , () => {
	
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

	it( "read signed bits" , () => {
		var buffer = Buffer.alloc( 16 ) ;
		buffer[ 0 ] = 0b00101101 ;
		buffer[ 1 ] = 0b11100111 ;
		buffer[ 2 ] = 0b01110110 ;
		buffer[ 3 ] = 0b00010101 ;
		buffer[ 4 ] = 0b01100000 ;

		// Read 2 bits
		expect( streamKit.readBufferBits( buffer , 7 , 2 , true ) ).to.be( -2 ) ;
		expect( streamKit.readBufferBits( buffer , 15 , 2 , true ) ).to.be( 1 ) ;

		// Read 20 bits, across 4 bytes
		expect( streamKit.readBufferBits( buffer , 6 , 20 , true ) ).to.be( 383900 ) ;
		expect( streamKit.readBufferBits( buffer , 7 , 20 , true ) ).to.be( -332338 ) ;

		// Old bug:
		expect( streamKit.readBufferBits( buffer , 33 , 6 , true ) ).to.be( -16 ) ;
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

	it( "write signed bits" , () => {
		var buffer ;
		
		buffer = Buffer.alloc( 16 ) ;
		streamKit.writeBufferBits( buffer , 4 , 4 , 7 , true ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b00000000000000000000000001110000 ) ;
		
		buffer = Buffer.alloc( 16 ) ;
		streamKit.writeBufferBits( buffer , 4 , 4 , 1 , true ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b00000000000000000000000000010000 ) ;

		buffer = Buffer.alloc( 16 ) ;
		streamKit.writeBufferBits( buffer , 4 , 4 , -1 , true ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b00000000000000000000000011110000 ) ;

		buffer = Buffer.alloc( 16 ) ;
		streamKit.writeBufferBits( buffer , 4 , 4 , -8 , true ) ;
		expect( buffer.readUInt32LE( 0 ) ).to.be( 0b00000000000000000000000010000000 ) ;
	} ) ;

	it( "1000 random read/write" , () => {
		var i , bitOffset , bitLength , value ,
			maxByteLength = 16 ,
			maxBitLength = maxByteLength * 8 ,
			buffer = Buffer.alloc( maxByteLength ) ;
		
		for ( i = 0 ; i < 1000 ; i ++ ) {
			bitOffset = Math.floor( Math.random() * maxBitLength ) ;
			bitLength = 1 + Math.floor( Math.random() * Math.min( 32 , maxBitLength - bitOffset ) ) ;
			value = Math.floor( Math.random() * ( 2 ** bitLength ) ) ;
			//console.log( ">>>" , bitOffset , bitLength , 2 ** bitLength , value ) ;

			streamKit.writeBufferBits( buffer , bitOffset , bitLength , value ) ;
			expect( streamKit.readBufferBits( buffer , bitOffset , bitLength ) ).to.be( value ) ;
		}
	} ) ;

	it( "1000 random signed read/write" , () => {
		var i , bitOffset , bitLength , value ,
			maxByteLength = 16 ,
			maxBitLength = maxByteLength * 8 ,
			buffer = Buffer.alloc( maxByteLength ) ;
		
		for ( i = 0 ; i < 1000 ; i ++ ) {
			bitOffset = Math.floor( Math.random() * maxBitLength ) ;
			bitLength = 1 + Math.floor( Math.random() * Math.min( 32 , maxBitLength - bitOffset ) ) ;
			value = Math.floor( Math.random() * ( 2 ** bitLength ) )  -  ( 2 ** ( bitLength - 1 ) ) ;
			//console.log( ">>>" , bitOffset , bitLength , 2 ** bitLength , value ) ;

			streamKit.writeBufferBits( buffer , bitOffset , bitLength , value , true ) ;
			expect( streamKit.readBufferBits( buffer , bitOffset , bitLength , true ) ).to.be( value ) ;
		}
	} ) ;
} ) ;

