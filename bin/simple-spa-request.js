#!/usr/bin/env node

import { chromium } from 'playwright';
import { argv } from 'process';

const DEFAULT_TIMEOUT = 3000;
const DEFAULT_METHOD = 'GET';
const DEFAULT_FORMAT = 'markdown';

const args = argv.slice(2);

let url = null;
let timeout = DEFAULT_TIMEOUT;
let javascript = '';
let waitAfterJs = 0;
let headers = {};
let method = DEFAULT_METHOD;
let body = '';
let format = DEFAULT_FORMAT;
let noConsole = false;
let noNetwork = false;
let noStyles = false;
let stylesheets = [];

for (const arg of args) {
  if (arg.startsWith('-t') || arg.startsWith('--timeout=')) {
    timeout = parseInt(arg.replace('-t', '').replace('--timeout=', ''), 10);
  } else if (arg.startsWith('-j') || arg.startsWith('--javascript=')) {
    javascript = arg.replace('-j', '').replace('--javascript=', '');
  } else if (arg.startsWith('-w') || arg.startsWith('--wait=')) {
    waitAfterJs = parseInt(arg.replace('-w', '').replace('--wait=', ''), 10);
  } else if (arg.startsWith('-h') || arg.startsWith('--header=')) {
    const headerValue = arg.replace('-h', '').replace('--header=', '');
    const [key, value] = headerValue.split(':');
    headers[key.trim()] = value.trim();
  } else if (arg === '--help') {
    console.log('Usage: simple-spa-request [arguments] <url>');
    console.log('');
    console.log('Arguments:');
    console.log('-t, --timeout=: Time in milliseconds after which to grab DOM/console/logs/network. Default: 3000');
    console.log('-j, --javascript=: Block of JavaScript to run in console after timeout. Default: none');
    console.log('-w, --wait=: Time in milliseconds after which to grab output if JavaScript is supplied. Default: 0');
    console.log('-h, --header=: Sets HTTP header for request (can be used for authorization). Multiple headers can be set. Default: none');
    console.log('-m, --method=: Sets HTTP method to use. Default: GET');
    console.log('-b, --body=: Specifies body to send with request (for POST). Default: none');
    console.log('-f, --format=: Specifies output format. Options: json, html, markdown. Default: markdown');
    console.log('-nc, --no-console: Skips including console output');
    console.log('-nn, --no-network: Skips including network output');
    console.log('-ns, --no-styles: Skips including stylesheet and rule output');
    process.exit(0);
  } else if (arg === '-ns' || arg === '--no-styles') {
    noStyles = true;
  } else if (arg.startsWith('-m') || arg.startsWith('--method=')) {
    body = arg.replace('-b', '').replace('--body=', '');
  } else if (arg.startsWith('-f') || arg.startsWith('--format=')) {
    format = arg.replace('-f', '').replace('--format=', '').toLowerCase();
  } else if (arg === '-nc' || arg === '--no-console') {
    noConsole = true;
  } else if (arg === '-nn' || arg === '--no-network') {
    noNetwork = true;
  } else if (!arg.startsWith('-')) {
    url = arg;
  }
}

if (!url) {
  console.error('Usage: simple-spa-request [arguments] <url>');
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    httpHeaders: headers
  });
  const page = await context.newPage();

  let requests = [];
  context.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      resourceType: request.resourceType(),
      postData: request.postData(),
    });
  });

  context.on('response', async response => {
    const request = response.request();

    const item = requests.find(r => r.url === request.url());

    if (item) {
      item.status = response.status();

      try {
        item.responseHeaders = await response.allHeaders();
      } catch {}
    }
  });

  let consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({type: msg.type(), text: msg.text()});
  });

  if (method === 'POST') {
    await page.goto(url, {
      method: 'POST',
      data: body,
      headers: headers
    });
  } else {
    await page.goto(url);
  }

  await new Promise(resolve => setTimeout(resolve, timeout));

  if (javascript) {
    await page.evaluate(javascript);
    await new Promise(resolve => setTimeout(resolve, waitAfterJs));
  }

  stylesheets = await page.evaluate(() => {
    return Array.from(document.styleSheets).map(sheet => {
      try {
        const rules = Array.from(sheet.cssRules).map(rule => rule.cssText);
        return {href: sheet.href || 'inline', rules};
      } catch {
        return {href: sheet.href || 'inline', rules: []};
      }
    });
  });

  const dom = await page.content();

   let networkRequests = [];
   if (!noNetwork) {
     networkRequests = requests;
   }

   await browser.close();

  if (format === 'json') {
    const output = {
      dom,
      consoleLogs,
      networkRequests,
      stylesheets
    };
    console.log(JSON.stringify(output, null, 2));
  } else if (format === 'html') {
    console.log(dom);
  } else if (format === 'markdown') {
    console.log('# DOM Output\n\n```\n' + dom + '\n```\n');
    if (!noConsole && consoleLogs.length > 0) {
      console.log('\n## Console Logs\n');
      for (const log of consoleLogs) {
        console.log('- [' + log.type + '] ' + log.text);
      }
    }
    if (!noNetwork && networkRequests.length > 0) {
      console.log('\n## Network Requests\n');
      for (const req of networkRequests) {
        console.log('- ' + req.url + ' (' + req.method + ') - Status: ' + (req.status || 'N/A') + ', Resource Type: ' + req.resourceType);
      }
    }
    if (!noStyles) {
      if (stylesheets.length > 0) {
        console.log('\n## Stylesheets\n');
        for (const sheet of stylesheets) {
          console.log('- ' + (sheet.href || 'Inline stylesheet'));
          if (sheet.rules && sheet.rules.length > 0) {
            console.log('  Rules:');
            for (const rule of sheet.rules) {
              console.log('    - ' + rule);
            }
          }
        }
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
