#!/usr/bin/env node

"use strict" ;

var streamKit = require( '..' ) ;
var fs = require( 'fs' ) ;
var stream = fs.createReadStream( '../package.json' ) ;

streamKit.getFullString( stream , 1000 )
.then( str => console.log( "Got:" + str ) )
.catch( error => console.error( "Error:" , error ) ) ;
