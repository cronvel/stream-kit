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



// Read bits instead of bytes
// Read small weight bits first
exports.readBufferBits = ( buffer , bitOffset , bitLength , signed = false ) => {
	var value , offset , valueOffset , highestBit ,
		byteStartOffset = bitOffset >> 3 ,
		bitStartOffsetInByte = bitOffset & 7 ,
		// End is included
		byteEndOffset = ( bitOffset + bitLength - 1 ) >> 3 ,
		bitEndOffsetInByte = ( bitOffset + bitLength - 1 ) & 7 ;

	if ( byteEndOffset >= buffer.length ) { throw new RangeError( "Bit offset out of range" ) ; }

	//console.log( ">>>" , byteStartOffset , bitStartOffsetInByte , byteEndOffset , bitEndOffsetInByte ) ;
	if ( byteStartOffset === byteEndOffset ) {
		// All bits are in a single byte
		value = ( buffer[ byteStartOffset ] >> bitStartOffsetInByte ) & ( 255 >> ( 7 - bitEndOffsetInByte + bitStartOffsetInByte ) ) ;
	}
	else {
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
	}

	if ( signed ) {
		if ( bitLength < 32 ) {
			highestBit = 2 ** ( bitLength - 1 ) ;
			if ( value >= highestBit ) { value -= 2 * highestBit ; }
		}
	}
	// The highest bit value is negative, since JS uses Int32 for bit operation, so we need to convert it back to UInt32
	else if ( value < 0 ) {
		value += 4294967296 ;
	}

	return value ;
} ;



// Create a bitmask that make a hole when ANDed.
// "end" is included.
function holeBitMask( start , end ) {
	return (
		// Leadings 1s
		( end < 7 ? ( ( 1 << ( 7 - end ) ) - 1 ) << ( end + 1 ) : 0 )
		// Trailing 1s
		+ ( start > 0 ? ( ( 1 << start ) - 1 ) : 0 )
	) ;
}



// Write bits instead of bytes
// Write small weight bits first
exports.writeBufferBits = ( buffer , bitOffset , bitLength , value , signed = false ) => {
	var offset , andMaskValue , orMaskValue , valueOffset ,
		minValue = signed ? - ( 2 ** ( bitLength - 1 ) ) : 0 ,
		maxValue = ( 2 ** ( signed ? bitLength - 1 : bitLength ) ) - 1 , // (1<<bitLength)-1 doesn't work (1 << 31 = -2147483648  and  1 << 32 = 1)
		byteStartOffset = bitOffset >> 3 ,
		bitStartOffsetInByte = bitOffset & 7 ,
		// End is included
		byteEndOffset = ( bitOffset + bitLength - 1 ) >> 3 ,
		bitEndOffsetInByte = ( bitOffset + bitLength - 1 ) & 7 ;

	if ( byteEndOffset >= buffer.length ) {
		throw new RangeError( ".writeBufferBits() Bit offset out of range" ) ;
	}

	if ( typeof value !== 'number' || value < minValue || value > maxValue ) {
		throw new RangeError( ".writeBufferBits() Value out of range (" + value + " not in " + minValue + " - " + maxValue + ")" ) ;
	}

	// For signed value of less than 32 bits, we need to convert it back to the corresponding UInt bits
	if ( signed && value < 0 && bitLength < 32 ) { value -= 2 * minValue ; }

	//console.log( ">>>" , byteStartOffset , bitStartOffsetInByte , byteEndOffset , bitEndOffsetInByte ) ;
	if ( byteStartOffset === byteEndOffset ) {
		// All bits are in a single byte
		andMaskValue = holeBitMask( bitStartOffsetInByte , bitEndOffsetInByte ) ;
		orMaskValue = ( value & ( 255 >> ( 7 - bitEndOffsetInByte + bitStartOffsetInByte ) ) ) << bitStartOffsetInByte ;
		buffer[ byteStartOffset ] = buffer[ byteStartOffset ] & andMaskValue | orMaskValue ;
		return ;
	}

	// Starting byte
	andMaskValue = holeBitMask( bitStartOffsetInByte , 7 ) ;
	orMaskValue = ( value & ( 255 >> bitStartOffsetInByte ) ) << bitStartOffsetInByte ;
	buffer[ byteStartOffset ] = buffer[ byteStartOffset ] & andMaskValue | orMaskValue ;
	valueOffset = 8 - bitStartOffsetInByte ;

	// Middle bytes
	for ( offset = byteStartOffset + 1 ; offset < byteEndOffset ; offset ++ , valueOffset += 8 ) {
		buffer[ offset ] = ( value >> valueOffset ) & 255 ;
	}

	// Ending byte
	andMaskValue = holeBitMask( 0 , bitEndOffsetInByte ) ;
	orMaskValue = ( value >> valueOffset ) & ( 255 >> ( 7 - bitEndOffsetInByte ) ) ;
	buffer[ byteEndOffset ] = buffer[ byteEndOffset ] & andMaskValue | orMaskValue ;
} ;

