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



// Buffer utils



// Read bits instead of bytes
// Read small weight bits first
exports.readBufferBits = ( buffer , bitOffset , bitLength ) => {
	var value , offset , valueOffset ,
		byteStartOffset = bitOffset >> 3 ,
		bitStartOffsetInByte = bitOffset & 7 ,
		// End is included
		byteEndOffset = ( bitOffset + bitLength - 1 ) >> 3 ,
		bitEndOffsetInByte = ( bitOffset + bitLength - 1 ) & 7 ;

	if ( byteEndOffset >= buffer.length ) { throw new RangeError( "Bit offset out of range" ) ; }

	//console.log( ">>>" , byteStartOffset , bitStartOffsetInByte , byteEndOffset , bitEndOffsetInByte ) ;
	if ( byteStartOffset === byteEndOffset ) {
		// All bits are in a single byte
		return ( buffer[ byteStartOffset ] >> bitStartOffsetInByte ) & ( 255 >> ( 7 - bitEndOffsetInByte + bitStartOffsetInByte ) ) ;
	}

	// Starting byte
	value = ( buffer[ byteStartOffset ] >> bitStartOffsetInByte ) & ( 255 >> bitStartOffsetInByte ) ;
	valueOffset = 8 - bitStartOffsetInByte ;

	// Middle bytes
	for ( offset = byteStartOffset + 1 ; offset < byteEndOffset ; offset ++ , valueOffset += 8 ) {
		//console.log( "<mid>" , offset , valueOffset ) ;
		value += buffer[ offset ] << valueOffset ;
	}

	// Ending byte
	//console.log( "<end>" , offset , valueOffset ) ;
	value += ( buffer[ offset ] & ( 255 >> ( 7 - bitEndOffsetInByte ) ) ) << valueOffset ;

	return value ;
} ;


const byteBitMask = ( start , end ) => {
} ;

// Write bits instead of bytes
// Write small weight bits first
exports.writeBufferBits = ( buffer , bitOffset , bitLength , value ) => {
	var offset , andMaskValue , orMaskValue , valueOffset ,
		byteStartOffset = bitOffset >> 3 ,
		bitStartOffsetInByte = bitOffset & 8 ,
		// End is included
		byteEndOffset = ( bitOffset + bitLength - 1 ) >> 3 ,
		bitEndOffsetInByte = ( bitOffset + bitLength - 1 ) & 8 ;
	
	if ( byteEndOffset >= buffer.length ) { throw new RangeError( "Bit offset out of range" ) ; }

	console.log( ">>>" , byteStartOffset , bitStartOffsetInByte , byteEndOffset , bitEndOffsetInByte ) ;
	if ( byteStartOffset === byteEndOffset ) {
		// All bits are in a single byte
		andMaskValue =
			// Leadings 1
			1 << ( 7 - bitEndOffsetInByte ) - 1
		orMaskValue = ( value & ( 255 >> ( 7 - bitEndOffsetInByte + bitStartOffsetInByte ) ) ) << bitStartOffsetInByte ;
		buffer[ byteStartOffset ] = buffer[ byteStartOffset ] & ( 255 & maskValue ) ;
		buffer[ byteStartOffset ] = buffer[ byteStartOffset ] | orMaskValue ;
	}

	// Starting byte
	buffer[ byteStartOffset ] = buffer[ byteStartOffset ] & ( ( value & ( 255 >> bitStartOffsetInByte ) ) << bitStartOffsetInByte ) ;
	valueOffset = 8 - bitStartOffsetInByte ;
	
	// Middle bytes
	for ( offset = byteStartOffset + 1 ; offset < byteEndOffset ; offset ++ , valueOffset += 8 ) {
		buffer[ offset ] = ( value >> valueOffset ) & 255 ;
	}
	
	// Ending byte
	buffer[ offset ] = buffer[ byteStartOffset ] & (
		( value >> valueOffset ) & ( 255 >> ( 7 - bitEndOffsetInByte ) )
	) ;
} ;

