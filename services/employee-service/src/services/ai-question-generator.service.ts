/**
 * AI Question Generator Service
 * Uses OpenAI to generate assessment questions based on category and difficulty
 */

import { logger } from '../utils/logger';
import { getMasterPrisma } from '@oms/database';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateQuestionsRequest {
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  count: number;
  questionTypes?: ('MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER')[];
}

export interface GeneratedQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MULTIPLE_SELECT';
  question: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  points: number;
  tags?: string[];
}

// ============================================================================
// PREDEFINED QUESTION TEMPLATES
// ============================================================================

// Since OpenAI API key is not configured, we use intelligent predefined questions
// organized by category and difficulty

const questionDatabase: Record<string, Record<string, GeneratedQuestion[]>> = {
  'JavaScript': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which keyword is used to declare a variable in JavaScript that cannot be reassigned?',
        options: [
          { id: '1', text: 'var', isCorrect: false },
          { id: '2', text: 'let', isCorrect: false },
          { id: '3', text: 'const', isCorrect: true },
          { id: '4', text: 'define', isCorrect: false },
        ],
        explanation: 'The const keyword declares a block-scoped variable that cannot be reassigned after initialization.',
        category: 'JavaScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['javascript', 'variables', 'fundamentals'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'JavaScript is a statically typed programming language.',
        options: [
          { id: '1', text: 'True', isCorrect: false },
          { id: '2', text: 'False', isCorrect: true },
        ],
        explanation: 'JavaScript is dynamically typed, meaning variable types are determined at runtime.',
        category: 'JavaScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['javascript', 'types', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What will console.log(typeof []) output?',
        options: [
          { id: '1', text: 'array', isCorrect: false },
          { id: '2', text: 'object', isCorrect: true },
          { id: '3', text: 'undefined', isCorrect: false },
          { id: '4', text: 'list', isCorrect: false },
        ],
        explanation: 'In JavaScript, arrays are objects, so typeof [] returns "object".',
        category: 'JavaScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['javascript', 'types', 'arrays'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which method is used to add an element to the end of an array?',
        options: [
          { id: '1', text: 'push()', isCorrect: true },
          { id: '2', text: 'pop()', isCorrect: false },
          { id: '3', text: 'shift()', isCorrect: false },
          { id: '4', text: 'unshift()', isCorrect: false },
        ],
        explanation: 'The push() method adds one or more elements to the end of an array.',
        category: 'JavaScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['javascript', 'arrays', 'methods'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'null === undefined returns true in JavaScript.',
        options: [
          { id: '1', text: 'True', isCorrect: false },
          { id: '2', text: 'False', isCorrect: true },
        ],
        explanation: 'Strict equality (===) checks both value and type. null and undefined are different types.',
        category: 'JavaScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['javascript', 'equality', 'fundamentals'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the output of: console.log([1, 2, 3].map(x => x * 2))?',
        options: [
          { id: '1', text: '[2, 4, 6]', isCorrect: true },
          { id: '2', text: '[1, 2, 3]', isCorrect: false },
          { id: '3', text: '6', isCorrect: false },
          { id: '4', text: 'undefined', isCorrect: false },
        ],
        explanation: 'The map() method creates a new array with each element multiplied by 2.',
        category: 'JavaScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['javascript', 'arrays', 'map'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which of the following is a valid way to create a Promise in JavaScript?',
        options: [
          { id: '1', text: 'new Promise((resolve, reject) => {})', isCorrect: true },
          { id: '2', text: 'Promise.new((resolve, reject) => {})', isCorrect: false },
          { id: '3', text: 'Promise.create((resolve, reject) => {})', isCorrect: false },
          { id: '4', text: 'new Promise.init((resolve, reject) => {})', isCorrect: false },
        ],
        explanation: 'The Promise constructor takes an executor function with resolve and reject parameters.',
        category: 'JavaScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['javascript', 'promises', 'async'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What does the spread operator (...) do when used with arrays?',
        options: [
          { id: '1', text: 'Expands an array into individual elements', isCorrect: true },
          { id: '2', text: 'Creates a deep copy of an array', isCorrect: false },
          { id: '3', text: 'Removes duplicate elements', isCorrect: false },
          { id: '4', text: 'Sorts the array', isCorrect: false },
        ],
        explanation: 'The spread operator expands an iterable into individual elements.',
        category: 'JavaScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['javascript', 'spread', 'es6'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'Arrow functions have their own "this" context.',
        options: [
          { id: '1', text: 'True', isCorrect: false },
          { id: '2', text: 'False', isCorrect: true },
        ],
        explanation: 'Arrow functions do not have their own "this" - they inherit it from the enclosing scope.',
        category: 'JavaScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['javascript', 'arrow-functions', 'this'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between == and === in JavaScript?',
        options: [
          { id: '1', text: '=== checks both value and type, == only checks value with type coercion', isCorrect: true },
          { id: '2', text: 'They are exactly the same', isCorrect: false },
          { id: '3', text: '== is faster than ===', isCorrect: false },
          { id: '4', text: '=== is deprecated', isCorrect: false },
        ],
        explanation: 'Triple equals (===) performs strict equality without type coercion.',
        category: 'JavaScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['javascript', 'equality', 'comparison'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the output of: console.log(typeof typeof 1)?',
        options: [
          { id: '1', text: '"string"', isCorrect: true },
          { id: '2', text: '"number"', isCorrect: false },
          { id: '3', text: '"undefined"', isCorrect: false },
          { id: '4', text: '"object"', isCorrect: false },
        ],
        explanation: 'typeof 1 returns "number" (a string), and typeof "number" returns "string".',
        category: 'JavaScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['javascript', 'typeof', 'advanced'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a closure in JavaScript?',
        options: [
          { id: '1', text: 'A function that has access to variables from its outer scope even after the outer function has returned', isCorrect: true },
          { id: '2', text: 'A way to close a browser window', isCorrect: false },
          { id: '3', text: 'A method to prevent memory leaks', isCorrect: false },
          { id: '4', text: 'A type of loop structure', isCorrect: false },
        ],
        explanation: 'Closures allow functions to remember and access their lexical scope.',
        category: 'JavaScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['javascript', 'closures', 'advanced'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What does Object.freeze() do?',
        options: [
          { id: '1', text: 'Makes an object immutable - prevents adding, removing, or modifying properties', isCorrect: true },
          { id: '2', text: 'Creates a copy of an object', isCorrect: false },
          { id: '3', text: 'Converts object to JSON', isCorrect: false },
          { id: '4', text: 'Removes all properties from an object', isCorrect: false },
        ],
        explanation: 'Object.freeze() prevents modifications to an object, making it immutable.',
        category: 'JavaScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['javascript', 'objects', 'immutability'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the event loop in JavaScript?',
        options: [
          { id: '1', text: 'A mechanism that handles asynchronous callbacks by checking the call stack and callback queue', isCorrect: true },
          { id: '2', text: 'A type of for loop', isCorrect: false },
          { id: '3', text: 'A DOM event handler', isCorrect: false },
          { id: '4', text: 'A debugging tool', isCorrect: false },
        ],
        explanation: 'The event loop continuously checks if the call stack is empty and processes the callback queue.',
        category: 'JavaScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['javascript', 'event-loop', 'async'],
      },
      {
        type: 'SHORT_ANSWER',
        question: 'What is the purpose of the "use strict" directive in JavaScript?',
        correctAnswer: 'Enables strict mode which catches common coding errors and prevents unsafe actions',
        explanation: 'Strict mode helps catch common coding mistakes and prevents certain unsafe actions.',
        category: 'JavaScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['javascript', 'strict-mode', 'best-practices'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between microtasks and macrotasks in JavaScript?',
        options: [
          { id: '1', text: 'Microtasks (Promises) have higher priority and execute before macrotasks (setTimeout)', isCorrect: true },
          { id: '2', text: 'They are the same thing', isCorrect: false },
          { id: '3', text: 'Macrotasks execute first', isCorrect: false },
          { id: '4', text: 'Microtasks are deprecated', isCorrect: false },
        ],
        explanation: 'Microtasks (Promise callbacks) are processed after the current script and before rendering.',
        category: 'JavaScript',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['javascript', 'event-loop', 'async', 'advanced'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the Temporal Dead Zone (TDZ) in JavaScript?',
        options: [
          { id: '1', text: 'The period between entering scope and variable declaration where let/const cannot be accessed', isCorrect: true },
          { id: '2', text: 'A memory management concept', isCorrect: false },
          { id: '3', text: 'A deprecated feature', isCorrect: false },
          { id: '4', text: 'Related to garbage collection', isCorrect: false },
        ],
        explanation: 'TDZ prevents accessing let/const variables before their declaration in the scope.',
        category: 'JavaScript',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['javascript', 'tdz', 'hoisting', 'advanced'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of WeakMap in JavaScript?',
        options: [
          { id: '1', text: 'To create a map with weakly held object keys that can be garbage collected', isCorrect: true },
          { id: '2', text: 'A slower version of Map', isCorrect: false },
          { id: '3', text: 'To store primitive values only', isCorrect: false },
          { id: '4', text: 'For performance optimization', isCorrect: false },
        ],
        explanation: 'WeakMap holds weak references to keys, allowing garbage collection when no other references exist.',
        category: 'JavaScript',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['javascript', 'weakmap', 'memory', 'advanced'],
      },
    ],
  },
  'React': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is JSX in React?',
        options: [
          { id: '1', text: 'A syntax extension that allows writing HTML-like code in JavaScript', isCorrect: true },
          { id: '2', text: 'A JavaScript library', isCorrect: false },
          { id: '3', text: 'A database query language', isCorrect: false },
          { id: '4', text: 'A CSS framework', isCorrect: false },
        ],
        explanation: 'JSX is a syntax extension for JavaScript that looks similar to HTML.',
        category: 'React',
        difficulty: 'EASY',
        points: 1,
        tags: ['react', 'jsx', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which hook is used to manage state in a functional component?',
        options: [
          { id: '1', text: 'useState', isCorrect: true },
          { id: '2', text: 'useEffect', isCorrect: false },
          { id: '3', text: 'useContext', isCorrect: false },
          { id: '4', text: 'useReducer', isCorrect: false },
        ],
        explanation: 'useState is the primary hook for adding state to functional components.',
        category: 'React',
        difficulty: 'EASY',
        points: 1,
        tags: ['react', 'hooks', 'state'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'React components must always return a single root element.',
        options: [
          { id: '1', text: 'True', isCorrect: true },
          { id: '2', text: 'False', isCorrect: false },
        ],
        explanation: 'Components must return a single root element, though you can use fragments (<></>) to group multiple elements.',
        category: 'React',
        difficulty: 'EASY',
        points: 1,
        tags: ['react', 'components', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the correct way to pass props to a child component?',
        options: [
          { id: '1', text: '<ChildComponent name="John" />', isCorrect: true },
          { id: '2', text: '<ChildComponent>.name = "John"</ChildComponent>', isCorrect: false },
          { id: '3', text: 'ChildComponent.props.name = "John"', isCorrect: false },
          { id: '4', text: '<ChildComponent props="name: John" />', isCorrect: false },
        ],
        explanation: 'Props are passed as attributes in JSX, similar to HTML attributes.',
        category: 'React',
        difficulty: 'EASY',
        points: 1,
        tags: ['react', 'props', 'fundamentals'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of useEffect hook?',
        options: [
          { id: '1', text: 'To perform side effects like data fetching, subscriptions, or DOM manipulation', isCorrect: true },
          { id: '2', text: 'To create new components', isCorrect: false },
          { id: '3', text: 'To style components', isCorrect: false },
          { id: '4', text: 'To handle form submissions only', isCorrect: false },
        ],
        explanation: 'useEffect is used for side effects that cannot be done during rendering.',
        category: 'React',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['react', 'hooks', 'useEffect'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between controlled and uncontrolled components?',
        options: [
          { id: '1', text: 'Controlled components have their state managed by React, uncontrolled use DOM directly', isCorrect: true },
          { id: '2', text: 'They are the same thing', isCorrect: false },
          { id: '3', text: 'Uncontrolled components are faster', isCorrect: false },
          { id: '4', text: 'Controlled components cannot be used in forms', isCorrect: false },
        ],
        explanation: 'Controlled components store form data in React state, while uncontrolled use refs.',
        category: 'React',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['react', 'forms', 'controlled'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Why is the key prop important when rendering lists?',
        options: [
          { id: '1', text: 'It helps React identify which items have changed, been added, or removed for efficient re-rendering', isCorrect: true },
          { id: '2', text: 'It is just for styling purposes', isCorrect: false },
          { id: '3', text: 'It is optional and has no effect', isCorrect: false },
          { id: '4', text: 'It prevents duplicate items', isCorrect: false },
        ],
        explanation: 'Keys help React optimize list rendering by tracking item identity.',
        category: 'React',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['react', 'lists', 'keys'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'useCallback returns a memoized version of a callback function.',
        options: [
          { id: '1', text: 'True', isCorrect: true },
          { id: '2', text: 'False', isCorrect: false },
        ],
        explanation: 'useCallback memoizes callbacks to prevent unnecessary re-renders.',
        category: 'React',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['react', 'hooks', 'useCallback'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is React.memo used for?',
        options: [
          { id: '1', text: 'To memoize a component and prevent re-renders when props have not changed', isCorrect: true },
          { id: '2', text: 'To memorize user preferences', isCorrect: false },
          { id: '3', text: 'To create memo notes in the app', isCorrect: false },
          { id: '4', text: 'To cache API responses', isCorrect: false },
        ],
        explanation: 'React.memo is a higher-order component that memoizes the rendered output.',
        category: 'React',
        difficulty: 'HARD',
        points: 3,
        tags: ['react', 'memo', 'performance'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of useReducer hook?',
        options: [
          { id: '1', text: 'To manage complex state logic with a reducer function similar to Redux', isCorrect: true },
          { id: '2', text: 'To reduce the bundle size', isCorrect: false },
          { id: '3', text: 'To reduce API calls', isCorrect: false },
          { id: '4', text: 'To minimize component re-renders', isCorrect: false },
        ],
        explanation: 'useReducer is an alternative to useState for complex state logic.',
        category: 'React',
        difficulty: 'HARD',
        points: 3,
        tags: ['react', 'hooks', 'useReducer'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a Higher-Order Component (HOC)?',
        options: [
          { id: '1', text: 'A function that takes a component and returns a new component with enhanced functionality', isCorrect: true },
          { id: '2', text: 'A component that renders other components', isCorrect: false },
          { id: '3', text: 'The top-level component in the tree', isCorrect: false },
          { id: '4', text: 'A deprecated pattern', isCorrect: false },
        ],
        explanation: 'HOCs are a pattern for reusing component logic.',
        category: 'React',
        difficulty: 'HARD',
        points: 3,
        tags: ['react', 'hoc', 'patterns'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is React Fiber?',
        options: [
          { id: '1', text: 'The reimplementation of React\'s core algorithm for incremental rendering', isCorrect: true },
          { id: '2', text: 'A state management library', isCorrect: false },
          { id: '3', text: 'A CSS-in-JS solution', isCorrect: false },
          { id: '4', text: 'A testing framework', isCorrect: false },
        ],
        explanation: 'Fiber is React\'s reconciliation engine that enables features like Suspense and concurrent mode.',
        category: 'React',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['react', 'fiber', 'internals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of React.lazy and Suspense?',
        options: [
          { id: '1', text: 'To enable code-splitting by dynamically importing components', isCorrect: true },
          { id: '2', text: 'To make components render slowly', isCorrect: false },
          { id: '3', text: 'To handle errors in components', isCorrect: false },
          { id: '4', text: 'To create animation effects', isCorrect: false },
        ],
        explanation: 'React.lazy enables dynamic imports and Suspense handles the loading state.',
        category: 'React',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['react', 'lazy', 'code-splitting'],
      },
    ],
  },
  'Python': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the correct way to create a list in Python?',
        options: [
          { id: '1', text: 'my_list = [1, 2, 3]', isCorrect: true },
          { id: '2', text: 'my_list = (1, 2, 3)', isCorrect: false },
          { id: '3', text: 'my_list = {1, 2, 3}', isCorrect: false },
          { id: '4', text: 'my_list = <1, 2, 3>', isCorrect: false },
        ],
        explanation: 'Lists in Python are created using square brackets [].',
        category: 'Python',
        difficulty: 'EASY',
        points: 1,
        tags: ['python', 'lists', 'fundamentals'],
      },
      {
        type: 'TRUE_FALSE',
        question: 'Python uses indentation to define code blocks.',
        options: [
          { id: '1', text: 'True', isCorrect: true },
          { id: '2', text: 'False', isCorrect: false },
        ],
        explanation: 'Python uses indentation instead of braces to define code blocks.',
        category: 'Python',
        difficulty: 'EASY',
        points: 1,
        tags: ['python', 'syntax', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which function is used to get the length of a list?',
        options: [
          { id: '1', text: 'len()', isCorrect: true },
          { id: '2', text: 'length()', isCorrect: false },
          { id: '3', text: 'size()', isCorrect: false },
          { id: '4', text: 'count()', isCorrect: false },
        ],
        explanation: 'The len() function returns the number of items in a sequence.',
        category: 'Python',
        difficulty: 'EASY',
        points: 1,
        tags: ['python', 'functions', 'lists'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a list comprehension in Python?',
        options: [
          { id: '1', text: 'A concise way to create lists using a single line of code', isCorrect: true },
          { id: '2', text: 'A way to understand lists', isCorrect: false },
          { id: '3', text: 'A debugging technique', isCorrect: false },
          { id: '4', text: 'A memory optimization', isCorrect: false },
        ],
        explanation: 'List comprehensions provide a concise way to create lists: [x*2 for x in range(10)]',
        category: 'Python',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['python', 'list-comprehension', 'syntax'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between a tuple and a list in Python?',
        options: [
          { id: '1', text: 'Tuples are immutable, lists are mutable', isCorrect: true },
          { id: '2', text: 'They are exactly the same', isCorrect: false },
          { id: '3', text: 'Lists are faster than tuples', isCorrect: false },
          { id: '4', text: 'Tuples can only store numbers', isCorrect: false },
        ],
        explanation: 'Tuples cannot be modified after creation, while lists can be changed.',
        category: 'Python',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['python', 'tuples', 'lists'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a decorator in Python?',
        options: [
          { id: '1', text: 'A function that modifies the behavior of another function without changing its code', isCorrect: true },
          { id: '2', text: 'A way to style terminal output', isCorrect: false },
          { id: '3', text: 'A design pattern for UI', isCorrect: false },
          { id: '4', text: 'A type of comment', isCorrect: false },
        ],
        explanation: 'Decorators wrap functions to extend their behavior using the @decorator syntax.',
        category: 'Python',
        difficulty: 'HARD',
        points: 3,
        tags: ['python', 'decorators', 'advanced'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the Global Interpreter Lock (GIL) in Python?',
        options: [
          { id: '1', text: 'A mutex that prevents multiple native threads from executing Python bytecodes at once', isCorrect: true },
          { id: '2', text: 'A security feature', isCorrect: false },
          { id: '3', text: 'A package manager', isCorrect: false },
          { id: '4', text: 'A debugging tool', isCorrect: false },
        ],
        explanation: 'The GIL ensures only one thread executes Python bytecode at a time in CPython.',
        category: 'Python',
        difficulty: 'HARD',
        points: 3,
        tags: ['python', 'gil', 'threading'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a metaclass in Python?',
        options: [
          { id: '1', text: 'A class whose instances are classes, allowing customization of class creation', isCorrect: true },
          { id: '2', text: 'A class for metadata', isCorrect: false },
          { id: '3', text: 'A deprecated feature', isCorrect: false },
          { id: '4', text: 'A testing utility', isCorrect: false },
        ],
        explanation: 'Metaclasses define how classes behave, with type being the default metaclass.',
        category: 'Python',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['python', 'metaclass', 'advanced'],
      },
    ],
  },
  'SQL': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which SQL clause is used to filter records?',
        options: [
          { id: '1', text: 'WHERE', isCorrect: true },
          { id: '2', text: 'HAVING', isCorrect: false },
          { id: '3', text: 'ORDER BY', isCorrect: false },
          { id: '4', text: 'GROUP BY', isCorrect: false },
        ],
        explanation: 'The WHERE clause is used to filter records based on a condition.',
        category: 'SQL',
        difficulty: 'EASY',
        points: 1,
        tags: ['sql', 'where', 'filtering'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which SQL statement is used to retrieve data from a database?',
        options: [
          { id: '1', text: 'SELECT', isCorrect: true },
          { id: '2', text: 'GET', isCorrect: false },
          { id: '3', text: 'FETCH', isCorrect: false },
          { id: '4', text: 'RETRIEVE', isCorrect: false },
        ],
        explanation: 'SELECT is the SQL statement used to query data from tables.',
        category: 'SQL',
        difficulty: 'EASY',
        points: 1,
        tags: ['sql', 'select', 'fundamentals'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between INNER JOIN and LEFT JOIN?',
        options: [
          { id: '1', text: 'INNER JOIN returns only matching rows, LEFT JOIN returns all rows from the left table', isCorrect: true },
          { id: '2', text: 'They are the same', isCorrect: false },
          { id: '3', text: 'LEFT JOIN is faster', isCorrect: false },
          { id: '4', text: 'INNER JOIN returns more rows', isCorrect: false },
        ],
        explanation: 'LEFT JOIN includes all rows from the left table, with NULL for non-matching right table rows.',
        category: 'SQL',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['sql', 'joins', 'queries'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of GROUP BY clause?',
        options: [
          { id: '1', text: 'To group rows that have the same values into summary rows', isCorrect: true },
          { id: '2', text: 'To sort the results', isCorrect: false },
          { id: '3', text: 'To filter duplicate rows', isCorrect: false },
          { id: '4', text: 'To join tables', isCorrect: false },
        ],
        explanation: 'GROUP BY is used with aggregate functions to group the result set.',
        category: 'SQL',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['sql', 'group-by', 'aggregation'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a CTE (Common Table Expression)?',
        options: [
          { id: '1', text: 'A temporary named result set that can be referenced within a SELECT, INSERT, UPDATE, or DELETE', isCorrect: true },
          { id: '2', text: 'A permanent table', isCorrect: false },
          { id: '3', text: 'A type of index', isCorrect: false },
          { id: '4', text: 'A database trigger', isCorrect: false },
        ],
        explanation: 'CTEs improve query readability and allow recursive queries using WITH clause.',
        category: 'SQL',
        difficulty: 'HARD',
        points: 3,
        tags: ['sql', 'cte', 'advanced'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between UNION and UNION ALL?',
        options: [
          { id: '1', text: 'UNION removes duplicates while UNION ALL keeps all rows including duplicates', isCorrect: true },
          { id: '2', text: 'UNION ALL is deprecated', isCorrect: false },
          { id: '3', text: 'They produce the same result', isCorrect: false },
          { id: '4', text: 'UNION is faster', isCorrect: false },
        ],
        explanation: 'UNION ALL is faster as it does not need to remove duplicates.',
        category: 'SQL',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['sql', 'union', 'performance'],
      },
    ],
  },
  'TypeScript': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is TypeScript?',
        options: [
          { id: '1', text: 'A typed superset of JavaScript that compiles to plain JavaScript', isCorrect: true },
          { id: '2', text: 'A completely different language from JavaScript', isCorrect: false },
          { id: '3', text: 'A JavaScript framework', isCorrect: false },
          { id: '4', text: 'A database query language', isCorrect: false },
        ],
        explanation: 'TypeScript adds optional static typing to JavaScript.',
        category: 'TypeScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['typescript', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'How do you define a variable with a string type?',
        options: [
          { id: '1', text: 'let name: string = "John"', isCorrect: true },
          { id: '2', text: 'let name = String("John")', isCorrect: false },
          { id: '3', text: 'string name = "John"', isCorrect: false },
          { id: '4', text: 'let String name = "John"', isCorrect: false },
        ],
        explanation: 'TypeScript uses colon syntax for type annotations.',
        category: 'TypeScript',
        difficulty: 'EASY',
        points: 1,
        tags: ['typescript', 'types', 'variables'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is an interface in TypeScript?',
        options: [
          { id: '1', text: 'A way to define the shape of an object', isCorrect: true },
          { id: '2', text: 'A class implementation', isCorrect: false },
          { id: '3', text: 'A function declaration', isCorrect: false },
          { id: '4', text: 'A type alias', isCorrect: false },
        ],
        explanation: 'Interfaces define contracts for object structures.',
        category: 'TypeScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['typescript', 'interfaces', 'types'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between "any" and "unknown" types?',
        options: [
          { id: '1', text: 'unknown requires type checking before use, any bypasses all type checking', isCorrect: true },
          { id: '2', text: 'They are the same', isCorrect: false },
          { id: '3', text: 'any is safer than unknown', isCorrect: false },
          { id: '4', text: 'unknown is deprecated', isCorrect: false },
        ],
        explanation: 'unknown is the type-safe counterpart of any.',
        category: 'TypeScript',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['typescript', 'any', 'unknown'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What are generics in TypeScript?',
        options: [
          { id: '1', text: 'A way to create reusable components that work with multiple types', isCorrect: true },
          { id: '2', text: 'Generic error messages', isCorrect: false },
          { id: '3', text: 'A testing framework', isCorrect: false },
          { id: '4', text: 'Default values for variables', isCorrect: false },
        ],
        explanation: 'Generics provide type safety while maintaining flexibility.',
        category: 'TypeScript',
        difficulty: 'HARD',
        points: 3,
        tags: ['typescript', 'generics', 'advanced'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is a conditional type in TypeScript?',
        options: [
          { id: '1', text: 'A type that selects one of two possible types based on a condition', isCorrect: true },
          { id: '2', text: 'An if-else statement', isCorrect: false },
          { id: '3', text: 'A runtime check', isCorrect: false },
          { id: '4', text: 'A validation rule', isCorrect: false },
        ],
        explanation: 'Conditional types use syntax: T extends U ? X : Y',
        category: 'TypeScript',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['typescript', 'conditional-types', 'advanced'],
      },
    ],
  },
  'Node.js': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is Node.js?',
        options: [
          { id: '1', text: 'A JavaScript runtime built on Chrome\'s V8 engine', isCorrect: true },
          { id: '2', text: 'A web browser', isCorrect: false },
          { id: '3', text: 'A database', isCorrect: false },
          { id: '4', text: 'A CSS framework', isCorrect: false },
        ],
        explanation: 'Node.js allows running JavaScript outside the browser.',
        category: 'Node.js',
        difficulty: 'EASY',
        points: 1,
        tags: ['nodejs', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'Which command is used to initialize a new Node.js project?',
        options: [
          { id: '1', text: 'npm init', isCorrect: true },
          { id: '2', text: 'node start', isCorrect: false },
          { id: '3', text: 'npm create', isCorrect: false },
          { id: '4', text: 'node init', isCorrect: false },
        ],
        explanation: 'npm init creates a new package.json file.',
        category: 'Node.js',
        difficulty: 'EASY',
        points: 1,
        tags: ['nodejs', 'npm', 'setup'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of package.json?',
        options: [
          { id: '1', text: 'To store project metadata, dependencies, and scripts', isCorrect: true },
          { id: '2', text: 'To store application data', isCorrect: false },
          { id: '3', text: 'To configure the database', isCorrect: false },
          { id: '4', text: 'To define CSS styles', isCorrect: false },
        ],
        explanation: 'package.json is the manifest file for Node.js projects.',
        category: 'Node.js',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['nodejs', 'npm', 'package-json'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between process.nextTick() and setImmediate()?',
        options: [
          { id: '1', text: 'nextTick executes before I/O callbacks, setImmediate executes after', isCorrect: true },
          { id: '2', text: 'They are the same', isCorrect: false },
          { id: '3', text: 'setImmediate is deprecated', isCorrect: false },
          { id: '4', text: 'nextTick is slower', isCorrect: false },
        ],
        explanation: 'nextTick callbacks are processed at the end of the current phase.',
        category: 'Node.js',
        difficulty: 'HARD',
        points: 3,
        tags: ['nodejs', 'event-loop', 'advanced'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of worker threads in Node.js?',
        options: [
          { id: '1', text: 'To enable parallel execution of CPU-intensive tasks without blocking the event loop', isCorrect: true },
          { id: '2', text: 'To handle HTTP requests', isCorrect: false },
          { id: '3', text: 'To manage database connections', isCorrect: false },
          { id: '4', text: 'To create child processes', isCorrect: false },
        ],
        explanation: 'Worker threads allow running JavaScript in parallel threads.',
        category: 'Node.js',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['nodejs', 'workers', 'parallelism'],
      },
    ],
  },
  'General Knowledge': {
    'EASY': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What does HTML stand for?',
        options: [
          { id: '1', text: 'HyperText Markup Language', isCorrect: true },
          { id: '2', text: 'High Tech Modern Language', isCorrect: false },
          { id: '3', text: 'Home Tool Markup Language', isCorrect: false },
          { id: '4', text: 'Hyperlink Text Making Language', isCorrect: false },
        ],
        explanation: 'HTML is the standard markup language for creating web pages.',
        category: 'General Knowledge',
        difficulty: 'EASY',
        points: 1,
        tags: ['html', 'web', 'fundamentals'],
      },
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What does CSS stand for?',
        options: [
          { id: '1', text: 'Cascading Style Sheets', isCorrect: true },
          { id: '2', text: 'Computer Style Sheets', isCorrect: false },
          { id: '3', text: 'Creative Style System', isCorrect: false },
          { id: '4', text: 'Colorful Style Sheets', isCorrect: false },
        ],
        explanation: 'CSS is used to style and layout web pages.',
        category: 'General Knowledge',
        difficulty: 'EASY',
        points: 1,
        tags: ['css', 'web', 'fundamentals'],
      },
    ],
    'MEDIUM': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the purpose of version control systems like Git?',
        options: [
          { id: '1', text: 'To track changes to code and enable collaboration among developers', isCorrect: true },
          { id: '2', text: 'To compile code', isCorrect: false },
          { id: '3', text: 'To run tests', isCorrect: false },
          { id: '4', text: 'To deploy applications', isCorrect: false },
        ],
        explanation: 'Git tracks file changes and enables team collaboration.',
        category: 'General Knowledge',
        difficulty: 'MEDIUM',
        points: 2,
        tags: ['git', 'version-control', 'collaboration'],
      },
    ],
    'HARD': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the difference between REST and GraphQL APIs?',
        options: [
          { id: '1', text: 'REST uses fixed endpoints, GraphQL allows clients to request exactly the data they need', isCorrect: true },
          { id: '2', text: 'They are the same', isCorrect: false },
          { id: '3', text: 'GraphQL is outdated', isCorrect: false },
          { id: '4', text: 'REST is faster', isCorrect: false },
        ],
        explanation: 'GraphQL provides more flexibility in data fetching.',
        category: 'General Knowledge',
        difficulty: 'HARD',
        points: 3,
        tags: ['api', 'rest', 'graphql'],
      },
    ],
    'EXPERT': [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is the CAP theorem in distributed systems?',
        options: [
          { id: '1', text: 'A system can only guarantee two of: Consistency, Availability, and Partition tolerance', isCorrect: true },
          { id: '2', text: 'A performance metric', isCorrect: false },
          { id: '3', text: 'A security protocol', isCorrect: false },
          { id: '4', text: 'A database design pattern', isCorrect: false },
        ],
        explanation: 'The CAP theorem is fundamental to understanding distributed systems trade-offs.',
        category: 'General Knowledge',
        difficulty: 'EXPERT',
        points: 5,
        tags: ['distributed-systems', 'cap', 'theory'],
      },
    ],
  },
};

// Available categories
export const availableCategories = Object.keys(questionDatabase);

// ============================================================================
// OPENAI INTEGRATION
// ============================================================================

interface OpenAISettings {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
  enabled: boolean;
  maxTokens: number;
  temperature: number;
}

// Structure for all AI integrations stored in database
interface IntegrationSettings {
  openai?: OpenAISettings;
  anthropic?: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  googleAI?: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  // Add more AI providers as needed
}

// In-memory cache for performance (reduces DB calls)
const settingsCache: Map<string, { data: IntegrationSettings; cachedAt: number }> = new Map();
const CACHE_TTL = 30000; // 30 second cache

/**
 * Save OpenAI settings to database for a tenant
 */
export async function setTenantOpenAISettings(tenantSlug: string, settings: OpenAISettings): Promise<void> {
  try {
    const prisma = getMasterPrisma();
    
    // Find tenant by slug
    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug },
    });
    
    if (!tenant) {
      logger.warn({ tenantSlug }, 'Tenant not found when saving OpenAI settings');
      throw new Error('Tenant not found');
    }
    
    // Check if tenant has settings using raw query
    const existingSettingsResult = await prisma.$queryRaw<{ id: string; integration_settings: any }[]>`
      SELECT id, integration_settings FROM tenant_settings WHERE tenant_id = ${tenant.id}
    `;
    
    const existingSettings = (existingSettingsResult[0]?.integration_settings as IntegrationSettings) || {};
    
    // Merge with new OpenAI settings
    const updatedSettings: IntegrationSettings = {
      ...existingSettings,
      openai: settings,
    };
    
    const enabledIntegrations = getEnabledIntegrations(updatedSettings);
    const settingsJson = JSON.stringify(updatedSettings);
    const integrationsArray = `{${enabledIntegrations.join(',')}}`;
    
    // Upsert using raw query to avoid type issues with new field
    if (existingSettingsResult.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE tenant_settings 
         SET integration_settings = $1::jsonb,
             integrations = $2::text[],
             updated_at = NOW()
         WHERE tenant_id = $3`,
        settingsJson,
        integrationsArray,
        tenant.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO tenant_settings (id, tenant_id, integration_settings, integrations, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2::jsonb, $3::text[], NOW(), NOW())`,
        tenant.id,
        settingsJson,
        integrationsArray
      );
    }
    
    // Update cache
    settingsCache.set(tenantSlug, { data: updatedSettings, cachedAt: Date.now() });
    logger.info({ tenantSlug }, 'OpenAI settings saved to database');
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'Failed to save OpenAI settings');
    throw error;
  }
}

/**
 * Get OpenAI settings from database for a tenant
 */
export async function getTenantOpenAISettings(tenantSlug: string): Promise<OpenAISettings | undefined> {
  const allSettings = await getTenantIntegrationSettings(tenantSlug);
  return allSettings?.openai;
}

/**
 * Get all integration settings for a tenant (from cache or database)
 */
export async function getTenantIntegrationSettings(tenantSlug: string): Promise<IntegrationSettings | undefined> {
  // Check cache first
  const cached = settingsCache.get(tenantSlug);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const prisma = getMasterPrisma();
    
    // Find tenant by slug and get integration settings using raw query
    const result = await prisma.$queryRaw<{ integration_settings: any }[]>`
      SELECT ts.integration_settings 
      FROM tenant_settings ts
      JOIN tenants t ON t.id = ts.tenant_id
      WHERE t.slug = ${tenantSlug}
    `;
    
    if (!result[0]?.integration_settings) {
      return undefined;
    }
    
    const settings = result[0].integration_settings as IntegrationSettings;
    
    // Update cache
    settingsCache.set(tenantSlug, { data: settings, cachedAt: Date.now() });
    
    return settings;
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'Failed to get integration settings');
    // Return cached value if available (even if expired)
    return cached?.data;
  }
}

/**
 * Clear OpenAI settings for a tenant
 */
export async function clearTenantOpenAISettings(tenantSlug: string): Promise<void> {
  try {
    const prisma = getMasterPrisma();
    
    // Get current settings
    const currentSettings = await getTenantIntegrationSettings(tenantSlug);
    if (currentSettings) {
      delete currentSettings.openai;
      
      const enabledIntegrations = getEnabledIntegrations(currentSettings);
      const settingsJson = JSON.stringify(currentSettings);
      const integrationsArray = `{${enabledIntegrations.join(',')}}`;
      
      // Update using raw query
      await prisma.$executeRawUnsafe(
        `UPDATE tenant_settings ts
         SET integration_settings = $1::jsonb,
             integrations = $2::text[],
             updated_at = NOW()
         FROM tenants t
         WHERE t.id = ts.tenant_id AND t.slug = $3`,
        settingsJson,
        integrationsArray,
        tenantSlug
      );
    }
    
    // Clear cache
    settingsCache.delete(tenantSlug);
    logger.info({ tenantSlug }, 'OpenAI settings cleared from database');
  } catch (error: any) {
    logger.error({ error: error.message, tenantSlug }, 'Failed to clear OpenAI settings');
    throw error;
  }
}

/**
 * Get list of enabled integrations for the integrations array
 */
function getEnabledIntegrations(settings: IntegrationSettings): string[] {
  const enabled: string[] = [];
  if (settings.openai?.enabled && settings.openai?.apiKey) enabled.push('openai');
  if (settings.anthropic?.enabled && settings.anthropic?.apiKey) enabled.push('anthropic');
  if (settings.googleAI?.enabled && settings.googleAI?.apiKey) enabled.push('google-ai');
  return enabled;
}

/**
 * Generate questions using OpenAI API
 */
async function generateWithOpenAI(
  settings: OpenAISettings,
  request: GenerateQuestionsRequest
): Promise<GeneratedQuestion[]> {
  const { category, difficulty, count, questionTypes = ['MULTIPLE_CHOICE'] } = request;
  
  const typeDescriptions = questionTypes.map(t => {
    switch(t) {
      case 'MULTIPLE_CHOICE': return 'MULTIPLE_CHOICE (4 options, 1 correct)';
      case 'TRUE_FALSE': return 'TRUE_FALSE (2 options: True/False)';
      case 'SHORT_ANSWER': return 'SHORT_ANSWER (no options, provide correctAnswer field)';
      case 'MULTIPLE_SELECT': return 'MULTIPLE_SELECT (4+ options, multiple can be correct)';
      default: return t;
    }
  }).join(', ');
  
  const systemPrompt = `You are an expert assessment question generator. Generate high-quality, professional assessment questions for job candidates.

Rules:
1. Questions must be clear, unambiguous, and technically accurate
2. For MULTIPLE_CHOICE questions, provide exactly 4 options with only one correct answer
3. For TRUE_FALSE questions, provide exactly 2 options: { "id": "1", "text": "True", "isCorrect": true/false }, { "id": "2", "text": "False", "isCorrect": true/false }
4. For SHORT_ANSWER questions, don't include options array, instead include a "correctAnswer" field with the expected answer
5. For MULTIPLE_SELECT questions, provide 4-6 options where multiple options can be correct
6. Include a brief explanation for each question
7. Assign appropriate points based on difficulty: EASY=1, MEDIUM=2, HARD=3, EXPERT=5
8. Questions should be practical and job-relevant
9. Distribute questions evenly across the requested types

Return ONLY valid JSON array, no markdown, no code blocks.`;

  const userPrompt = `Generate ${count} ${difficulty} level questions about "${category}".

Question types to include (distribute evenly): ${typeDescriptions}

Return a JSON array. Examples for each type:

For MULTIPLE_CHOICE:
{ "type": "MULTIPLE_CHOICE", "question": "...", "options": [{"id":"1","text":"A","isCorrect":false},{"id":"2","text":"B","isCorrect":true},{"id":"3","text":"C","isCorrect":false},{"id":"4","text":"D","isCorrect":false}], "explanation": "...", "category": "${category}", "difficulty": "${difficulty}", "points": ${difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : difficulty === 'HARD' ? 3 : 5}, "tags": [] }

For TRUE_FALSE:
{ "type": "TRUE_FALSE", "question": "...", "options": [{"id":"1","text":"True","isCorrect":true},{"id":"2","text":"False","isCorrect":false}], "explanation": "...", "category": "${category}", "difficulty": "${difficulty}", "points": ${difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : difficulty === 'HARD' ? 3 : 5}, "tags": [] }

For SHORT_ANSWER:
{ "type": "SHORT_ANSWER", "question": "...", "correctAnswer": "expected answer", "explanation": "...", "category": "${category}", "difficulty": "${difficulty}", "points": ${difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : difficulty === 'HARD' ? 3 : 5}, "tags": [] }

For MULTIPLE_SELECT:
{ "type": "MULTIPLE_SELECT", "question": "...", "options": [{"id":"1","text":"A","isCorrect":true},{"id":"2","text":"B","isCorrect":true},{"id":"3","text":"C","isCorrect":false},{"id":"4","text":"D","isCorrect":false}], "explanation": "...", "category": "${category}", "difficulty": "${difficulty}", "points": ${difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : difficulty === 'HARD' ? 3 : 5}, "tags": [] }

Generate exactly ${count} questions now:`;

  try {
    logger.info({ model: settings.model, category, difficulty, count, questionTypes }, 'Calling OpenAI API');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error({ status: response.status, error }, 'OpenAI API error');
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    // Clean up the content - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const questions: GeneratedQuestion[] = JSON.parse(cleanContent);
    
    logger.info({ count: questions.length }, 'Successfully generated questions with OpenAI');
    
    return questions;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate questions with OpenAI');
    throw error;
  }
}

// ============================================================================
// AI QUESTION GENERATOR SERVICE
// ============================================================================

export class AIQuestionGeneratorService {
  /**
   * Generate questions based on category and difficulty
   * Uses OpenAI if configured, otherwise falls back to predefined database
   */
  static async generateQuestions(
    request: GenerateQuestionsRequest,
    tenantId?: string
  ): Promise<GeneratedQuestion[]> {
    const { category, difficulty, count } = request;
    
    logger.info({ category, difficulty, count, tenantId }, 'Generating AI questions');
    
    // Check if OpenAI is configured for this tenant
    if (tenantId) {
      const openAISettings = await getTenantOpenAISettings(tenantId);
      
      if (openAISettings?.enabled && openAISettings?.apiKey) {
        logger.info({ tenantId, model: openAISettings.model }, 'Using OpenAI for question generation');
        
        try {
          const questions = await generateWithOpenAI(openAISettings, request);
          if (questions.length > 0) {
            return questions;
          }
          logger.warn('OpenAI returned no questions, falling back to predefined database');
        } catch (error: any) {
          logger.error({ error: error.message }, 'OpenAI generation failed, falling back to predefined database');
        }
      }
    }
    
    // Fallback: Get questions from our predefined database
    logger.info({ category, difficulty }, 'Using predefined question database');
    
    const categoryQuestions = questionDatabase[category];
    
    if (!categoryQuestions) {
      // If category not found, try to find a close match or use General Knowledge
      logger.warn({ category }, 'Category not found, using General Knowledge');
      const fallbackQuestions = questionDatabase['General Knowledge']?.[difficulty] || [];
      return fallbackQuestions.slice(0, count);
    }
    
    const difficultyQuestions = categoryQuestions[difficulty];
    
    if (!difficultyQuestions || difficultyQuestions.length === 0) {
      logger.warn({ category, difficulty }, 'No questions for this difficulty level');
      return [];
    }
    
    // Shuffle and return requested count
    const shuffled = [...difficultyQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
  
  /**
   * Get available categories
   * When OpenAI is enabled, return more categories
   */
  static async getAvailableCategories(tenantId?: string): Promise<string[]> {
    const baseCategories = availableCategories;
    
    // If OpenAI is configured, we can generate for any category
    if (tenantId) {
      const openAISettings = await getTenantOpenAISettings(tenantId);
      if (openAISettings?.enabled && openAISettings?.apiKey) {
        // Add more categories that OpenAI can handle
        return [
          ...baseCategories,
          'Java',
          'C++',
          'C#',
          'Go',
          'Rust',
          'Ruby',
          'PHP',
          'Swift',
          'Kotlin',
          'AWS',
          'Azure',
          'Docker',
          'Kubernetes',
          'DevOps',
          'Machine Learning',
          'Data Science',
          'Cybersecurity',
          'System Design',
          'Algorithms',
          'Data Structures',
        ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
      }
    }
    
    return baseCategories;
  }
  
  /**
   * Get questions count by category and difficulty
   */
  static getQuestionCount(category: string, difficulty: string): number {
    return questionDatabase[category]?.[difficulty]?.length || 0;
  }
  
  /**
   * Check if OpenAI is configured for a tenant
   */
  static async isOpenAIConfigured(tenantId: string): Promise<boolean> {
    const settings = await getTenantOpenAISettings(tenantId);
    return !!(settings?.enabled && settings?.apiKey);
  }
}
