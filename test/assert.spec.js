// # Assert.js
// A run-time type assertion library for JavaScript. Designed to be used with [Traceur](https://github.com/google/traceur-compiler).


// - [Basic Type Check](#basic-type-check)
// - [Custom Check](#custom-check)
// - [Primitive Values](#primitive-values)
// - [Describing more complex types](#describing-more-complex-types)
//   - [assert.arrayOf](#assert-arrayof)
//   - [assert.structure](#assert-structure)
// - [Integrating with Traceur](#integrating-with-traceur)

import {assert} from 'assert';



// ## Basic Type Check
// By default, `instanceof` is used to check the type.
//
// Note, you can use `assert.type()` when unit testing or anywhere in your code.
// However, most of the time, you will use it with Traceur.
// Jump to the [Traceur section](#integrating-with-traceur) to see an example of that.
describe('basic type check', function() {

  class Type {}

  it('should pass', function() {
    assert.type(new Type(), Type);
  });


  it('should fail', function() {
    expect(() => assert.type(123, Type))
      .toThrowError('Expected an instance of Type, got 123!');
  });
});



// ## Custom Check
// Often, `instanceof` is not flexible enough.
// In that case, your type can define its own `assert` method, which will be used instead.
//
// See define" for examples how to define custom checks, using the `assert.define()`.
describe('custom check', function() {

  class Type {}

  // the basic check can just return true/false, without specifying any reason
  it('should pass when returns true', function() {
    Type.assert = function(value) {
      return true;
    };

    assert.type({}, Type);
  });


  it('should fail when returns false', function() {
    Type.assert = function(value) {
      return false;
    };

    expect(() => assert.type({}, Type))
      .toThrowError('Expected an instance of Type, got {}!');
  });


  // Using `assert.fail()` allows to report even multiple errors.
  it('should fail when calls assert.fail()', function() {
    Type.assert = function(value) {
      assert.fail('not smart enough');
      assert.fail('not blue enough');
    };

    expect(() => assert.type({}, Type))
      .toThrowError('Expected an instance of Type, got {}!\n' +
                    '  - not smart enough\n' +
                    '  - not blue enough');
  });


  it('should fail when throws an exception', function() {
    Type.assert = function(value) {
      throw new Error('not long enough');
    };

    expect(function() {
      assert.type(null, Type);
    }).toThrowError('Expected an instance of Type, got null!\n' +
                    '  - not long enough');
  });
});



// ## Primitive Values
// You don't wanna check primitive values such as strings, numbers or booleans with `instanceof`.
// These get check using `typeof`.
//
// Again, you probably won't write this code and rather use Traceur to do it for you, simply based on type annotations.
describe('primitive value check', function() {
  var primitive = $traceurRuntime.type;

  describe('string', function() {

    it('should pass', function() {
      assert.type('xxx', primitive.string);
    });


    it('should fail', function() {
      expect(() => assert.type(null, assert.string))
        .toThrowError('Expected an instance of string, got null!');
    });
  });


  describe('number', function() {

    it('should pass', function() {
      assert.type(123, primitive.number);
    });


    it('should fail', function() {
      expect(() => assert.type(false, primitive.number))
        .toThrowError('Expected an instance of number, got false!');
    });
  });


  describe('boolean', function() {

    it('should pass', function() {
      assert.type(true, primitive.boolean);
      assert.type(false, primitive.boolean);
    });


    it('should fail', function() {
      expect(() => assert.type(123, primitive.boolean))
        .toThrowError('Expected an instance of boolean, got 123!');
    });
  });
});



// ## Describing more complex types
//
// Often, a simple type check using `instanceof` or `typeof` is not enough.
// That's why you can define custom checks using this DSL.
// The goal was to make them easy to compose and as descriptive as possible.
// Of course you can write your own DSL on the top of this.
describe('define', function() {

  // If the first argument to `assert.define()` is a type (function), it will define `assert` method on that function.
  //
  // In this example, being a type of Type means being a either a function or object.
  it('should define assert for an existing type', function() {
    class Type {}

    assert.define(Type, function(value) {
      assert(value).is(Function, Object);
    });

    assert.type({}, Type);
    assert.type(function() {}, Type);
    expect(() => assert.type('str', Type))
      .toThrowError('Expected an instance of Type, got "str"!\n' +
                    '  - "str" is not instance of Function\n' +
                    '  - "str" is not instance of Object');
  });


  // If the first argument to `assert.define()` is a string,
  // it will create an interface - basically an empty class with `assert` method.
  it('should define an interface', function() {
    var User = assert.define('MyUser', function(user) {
      assert(user).is(Object);
    });

    assert.type({}, User);
    expect(() => assert.type(12345, User))
      .toThrowError('Expected an instance of MyUser, got 12345!\n' +
                    '  - 12345 is not instance of Object');
  });


  // Here are a couple of more APIs to describe your custom types...
  //
  // ### assert.arrayOf
  // Checks if the value is an array and if so, it checks whether all the items are one the given types.
  // Note, these types can be composed types, not just simple ones.
  describe('arrayOf', function() {

    var Titles = assert.define('ListOfTitles', function(value) {
      assert(value).is(assert.arrayOf(assert.string, assert.number));
    });

    it('should pass', function () {
      assert.type(['one', 55, 'two'], Titles);
    });


    it('should fail when non-array given', function () {
      expect(() => assert.type(null, Titles))
        .toThrowError('Expected an instance of ListOfTitles, got null!\n' +
                      '  - null is not instance of array of string/number\n' +
                      '    - null is not instance of Array');
    });


    it('should fail when an invalid item in the array', function () {
      expect(() => assert.type(['aaa', true], Titles))
        .toThrowError('Expected an instance of ListOfTitles, got ["aaa", true]!\n' +
                      '  - ["aaa", true] is not instance of array of string/number\n' +
                      '    - true is not instance of string\n' +
                      '    - true is not instance of number');
    });
  });


  // ### assert.structure
  // Similar to `assert.arrayOf` which checks a content of an array,
  // `assert.structure` checks if the value is an object with specific properties.
  describe('structure', function() {

    var User = assert.define('MyUser', function(value) {
      assert(value).is(assert.structure({
        name: assert.string,
        age: assert.number
      }));
    });

    it('should pass', function () {
      assert.type({name: 'Vojta', age: 28}, User);
    });


    it('should fail when non-object given', function () {
      expect(() => assert.type(null, User))
        .toThrowError('Expected an instance of MyUser, got null!\n' +
                      '  - null is not instance of object with properties name, age\n' +
                      '    - null is not instance of Object');
    });


    it('should fail when an invalid property', function () {
      expect(() => assert.type({name: 'Vojta', age: true}, User))
        .toThrowError('Expected an instance of MyUser, got {name: "Vojta", age: true}!\n' +
                      '  - {name: "Vojta", age: true} is not instance of object with properties name, age\n' +
                      '    - true is not instance of number');
    });
  });
});



// ## Integrating with Traceur
//
// Most of the time, you won't put `assert.type()` calls in your code and rather have Traceur to do it for you,
// based on the type annotations.
//
// This has several advantages:
// - it's shorter and nicer,
// - you can easily ignore it when generating production code.
//
// Note, you need to run Traceur with `--types=true --type-assertions=true --type-assertion-module="path/to/assert"`.
describe('Traceur', function() {

  describe('arguments', function() {

    function reverse(str: string) {
      return str ? reverse(str.substring(1)) + str[0] : ''
    }

    it('should pass', function() {
      expect(reverse('angular')).toBe('ralugna');
    });


    it('should fail', function() {
      expect(() => reverse(123))
        .toThrowError('Invalid arguments given!\n' +
                      '  - 1st argument has to be an instance of string, got 123');
    });
  });


  describe('return value', function() {

    function foo(bar): number {
      return bar;
    }

    it('should pass', function() {
      expect(foo(123)).toBe(123);
    });


    it('should fail', function() {
      expect(() => foo('bar'))
        .toThrowError('Expected to return an instance of number, got "bar"!');
    });
  });


  describe('variables', function() {

    it('should pass', function() {
      var count:number = 1;
    });


    it('should fail', function() {
      expect(() => {
        var count: number = null;
      }).toThrowError('Expected an instance of number, got null!');
    });
  });
});


// <center><small>
// This documentation has been generated from [assert.spec.js](https://github.com/vojtajina/assert/blob/master/test/assert.spec.js), using [Docco](http://jashkenas.github.io/docco/).
// </small></center>
