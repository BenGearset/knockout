# Knockout with `proxy-compare`
This is a PoC fork using [`proxy-compare`](https://github.com/dai-shi/proxy-compare) to check an observable containing an object for changes. In standard knockout, any change to an object (even if its identical), will trigger a refresh. This fork uses `proxy-compare` to only trigger a refresh when an object's properties have changed and, more magically, only refresh if that property is actually used in the view or view model.

**Knockout** is a JavaScript [MVVM](http://en.wikipedia.org/wiki/Model_View_ViewModel) (a modern variant of MVC) library that makes it easier to create rich, desktop-like user interfaces with JavaScript and HTML. It uses *observers* to make your UI automatically stay in sync with an underlying data model, along with a powerful and extensible set of *declarative bindings* to enable productive development.

## Getting started

[![Join the chat at https://gitter.im/knockout/knockout](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/knockout/knockout?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

**Totally new to Knockout?** The most fun place to start is the [online interactive tutorials](http://learn.knockoutjs.com/).

For more details, see

 * Documentation on [the project's website](http://knockoutjs.com/documentation/introduction.html)
 * Online examples at [http://knockoutjs.com/examples/](http://knockoutjs.com/examples/)

## Downloading Knockout

You can [download released versions of Knockout](http://knockoutjs.com/downloads/) from the project's website.

For Node.js developers, Knockout is also available from [npm](https://npmjs.org/) - just run `npm install knockout`.

## Building Knockout from sources

If you prefer to build the library yourself:

1. **Clone the repo from GitHub**

   ```sh
   git clone https://github.com/knockout/knockout.git
   cd knockout
   ```

2. **Acquire build dependencies.**

   Make sure you have [Node.js](http://nodejs.org/) and [Java](https://www.java.com/en/) installed on your workstation. These are only needed to _build_ Knockout from sources. Knockout itself has no dependency on Node.js or Java once it is built (it works with any server technology or none). Now run:

   ```sh
   npm install
   ```

3. **Run the build tool**

   ```sh
   npm run grunt
   ```
   Now you'll find the built files in `build/output/`.

   To run a single task, use `--`

   ```sh
   npm run grunt -- build:debug
   ```

## Running the tests

If you have [phantomjs](http://phantomjs.org/download.html) installed, then the `grunt` script will automatically run the specification suite and report its results.

Or, if you want to run the specs in a browser (e.g., for debugging), simply open `spec/runner.html` in your browser.

## License

MIT license - [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)
