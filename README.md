# simple-spa-request

A CLI tool for fetching DOM, console logs, stylesheet rules and network requests from Single Page Application (SPA) websites using Playwright. It returns the data as either the raw HTML DOM, a Markdown document, or a JSON object; it is meant to feed other applications such as local LLMs or scripts.

## Installation

```bash
npm install -g simple-spa-request
```

or

```bash
yarn install -g simple-spa-request
```

## Usage

```bash
simple-spa-request <url> [arguments]
```

## Arguments

- `-t`, `--timeout=`: Time in milliseconds after which to grab the DOM/console logs/network tab. Default: 3000.
- `-j`, `--javascript=`: Block of JavaScript to run in the console after the timeout period. Default: none.
- `-w`, `--wait=`: Time in milliseconds after which to grab the DOM/console logs/network tab if JavaScript argument is supplied. Default: 0 (no effect without JavaScript).
- `-h`, `--header=`: Sets an HTTP header to be sent with the request. Can be used for authorization tokens. Multiple headers can be set. Default: none.
- `-m`, `--method=`: Sets the HTTP method to use. Default: GET.
- `-b`, `--body=`: Specifies a body to send with the request (for POST requests). Default: none.
- `-f`, `--format=`: Specifies output format. Options: json, html, markdown. Default: markdown.
- `-nc`, `--no-console`: Skips including console output.
- `-nn`, `--no-network`: Skips including network output.
- `-ns`, `--no-styles`: Skips including stylesheet and rule output.

## Examples

Basic request with default timeout:

```bash
simple-spa-request https://example.com
```

Request with custom timeout:

```bash
simple-spa-request -t 5000 https://example.com
```

Request with authorization header:

```bash
simple-spa-request -h "Authorization: Bearer token123" https://api.example.com
```

POST request with body:

```bash
simple-spa-request -m POST -b '{"key": "value"}' https://example.com/api
```

Run JavaScript and wait after execution:

```bash
simple-spa-request -j "document.getElementById('button').click()" -w 1000 https://example.com
```

Output as JSON:

```bash
simple-spa-request -f json https://example.com
```

Skip console and network output:

```bash
simple-spa-request -nc -nn https://example.com
```

## Output Format

### Markdown (default)

The output includes:
- DOM content in a code block
- Console logs as bullet points
- Network requests with URL, method, and status

### HTML

Raw HTML/DOM output only.

### JSON

JSON object containing:
- `dom`: DOM content
- `consoleLogs`: Array of console log messages
- `networkRequests`: Array of network request details

## License

MIT
