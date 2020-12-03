#!/usr/bin/env node

/*
  INSTALL:
  */

const fs = require('fs');
const cp = require('child_process');
const rl = require('readline').createInterface({
  input:  process.stdin,
  output: process.stdout
});

// Each unix program has 3 "pipes"
// 0: stdin  - read input from the terminal or another program
// 1: stdout - output to the terminal or another program
// 2: stderr - write error messages to the terminal (usually)

const USAGE = "Usage: swap-pump SIZE (1G, 512M, 16G...)";
const FILE  = "/swapfile";

if ( process.argv.length !== 3 ){
  console.error(USAGE);
  process.exit(1);
}

const [
  interpreter,  // first argument is the node application
  script,       // second argument is the path to our script
  size          // the new size of the swap file
] = process.argv;

if ( ! fs.existsSync(FILE) ){
  console.error(`You don't have a ${FILE}. This script will not work for you.`);
  process.exit(1);
}

if ( ! size.match(/[0-9]+G/) ){
  console.error(USAGE);
  process.exit(1);
}

const sizeAsNumber    = parseInt(size);

const duOutput        = cp.execSync(`du -h ${FILE}`,{encoding:'utf8'});
const splitOutput     = duOutput.split(/[ \t]+/);
const [ currentSize ] = splitOutput;

const prompt = `
Your current ${FILE} has ${currentSize}.
You want to resize it to ${sizeAsNumber}G.
Do you want to proceed (*no/yes):`;

rl.question(
  prompt.trim(),
  ( answer ) => {
    if ( answer.trim().toLowerCase() !== 'yes' ){
      console.log(`That's probably for the best...`);
      process.exit(0);
    } else { // the answer is yes, user is sure
      console.log(`Ok, resizing your ${FILE} to ${size}...`);

      const main = cp.exec(`
      swapoff -a
      dd if=/dev/zero of=${FILE} bs=250M count=${sizeAsNumber*4}
      # truncate -s ${sizeAsNumber}G ${FILE}
      chmod 600 ${FILE}
      mkswap ${FILE}
      swapon ${FILE}
      `,{ encoding:'utf8' });
      main.stderr.on('data', data => console.error(data) );

      const timer = setInterval(
        () => {
          const [ s ] = cp.execSync(`du -h ${FILE}`,{encoding:'utf8'}).split(/[ \t]+/);
          console.log(`${FILE} is at ${s}`);
        }, 250
      );

      main.on('close', ()=> {
        clearInterval(timer);
        console.error('Finished. Have a lot of fun!')
      });
    }
    
    rl.close();
});
