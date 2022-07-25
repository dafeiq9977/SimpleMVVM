/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/constants.ts":
/*!**************************!*\
  !*** ./src/constants.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.dataValueSymbol = exports.directivePrefix = exports.dereferenceExpressionReg = exports.JSStringReg = exports.interpolationReg = void 0;
const util_1 = __webpack_require__(/*! ./core/util */ "./src/core/util.ts");
/**
 * 文本插值模式正则表达式
 */
exports.interpolationReg = /\{\{.*?\}\}/g;
/**
 * 方括号引用属性写法正则表达式
 * e.g 'a'合法；abc非法
 */
exports.JSStringReg = /^['"]{1}[A-Za-z0-9_$]{1,}['"]{1}$/;
/**
 * 变量引用表达式的正则表达式（仅检测第一层）
 * e.g a[b]是合法表达式；a[]是非法表达式
 */
exports.dereferenceExpressionReg = /^[A-Za-z0-9_$]+(?:(?:\.[A-Za-z0-9_$]+)|(?:\[[A-Za-z0-9_$.'"\[\]]+\]))*$/;
/**
 * 指令固定前缀字符串
 * e.g mvvm-model是双向绑定数据指令
 */
exports.directivePrefix = 'mvvm-';
/**
 * 作为存放绑定数据每个属性的属性值，属性类型和订阅者集合的键名
 * 选用symbol避免和原数据已有的属性重复
 */
exports.dataValueSymbol = Symbol.for((0, util_1.randomString)(10));


/***/ }),

/***/ "./src/core/compile/compiler.ts":
/*!**************************************!*\
  !*** ./src/core/compile/compiler.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Compiler = void 0;
const constants_1 = __webpack_require__(/*! ../../constants */ "./src/constants.ts");
const constants_2 = __webpack_require__(/*! ../../constants */ "./src/constants.ts");
const util_1 = __webpack_require__(/*! ../util */ "./src/core/util.ts");
const util_2 = __webpack_require__(/*! ../util */ "./src/core/util.ts");
const util_3 = __webpack_require__(/*! ../util */ "./src/core/util.ts");
;
;
/**
 * Compiler类：负责编译挂载在应用上的DOM节点
 */
class Compiler {
    /**
     * 一个选择器一个应用构建唯一一个Compiler对象
     * @param selector DOM节点选择器字符串，告诉Compiler编译哪个节点
     * @param mvvm 应用对象，告诉Compiler为哪个应用编译
     */
    constructor(selector, mvvm) {
        this.mvvmInstance = mvvm;
        this.mvvmAncestor = document.querySelector(selector);
        this.curNode = this.mvvmAncestor;
    }
    /**
     * 编译DOM节点及其所有子节点，提取和应用有关的所有字符串，按照一定格式保存起来
     * @returns 返回Compiler对象引用，方便链式调用
     */
    shallowCompile() {
        const that = this;
        const ancestor = this.curNode;
        const mvvm = this.mvvmInstance;
        // 节点不存在直接返回
        if (!ancestor) {
            return this;
        }
        // 将节点的子节点转化为数组遍历编译
        Array.from(ancestor.childNodes).forEach(function (node) {
            const elementType = node.nodeType;
            // node节点类型值等于3，是文本节点
            if (elementType === 3) {
                const content = node.nodeValue;
                if (!(content && constants_1.interpolationReg.test(content))) {
                    return;
                }
                // 匹配符合文本插值格式的所有子字符串以及文本中的固定值部分，保存在数组中
                let matches = content.match(constants_1.interpolationReg);
                let textConstants = content.split(constants_1.interpolationReg);
                mvvm.hooks.push({
                    domNode: node,
                    type: 1 /* BindType.TextInterpolation */,
                    postfix: [],
                    value: {
                        strConstants: textConstants,
                        strVariables: matches,
                    }
                });
            }
            // node节点类型值等于1，是HTML元素节点
            else if (elementType === 1) {
                // 遍历HTML元素的所有属性，找出符合MVVM指令格式的属性名
                const nodeAttrs = node.attributes;
                let nodeAttrArr = Array.from(nodeAttrs);
                for (let i = 0; i < nodeAttrArr.length; i++) {
                    let attribute = nodeAttrArr[i];
                    const attrName = attribute.name;
                    const attrValue = attribute.value;
                    if (attrName.startsWith(constants_1.directivePrefix)) {
                        mvvm.hooks.push({
                            domNode: node,
                            type: 2 /* BindType.Directive */,
                            postfix: [],
                            directive: {
                                dirName: attrName.slice(constants_1.directivePrefix.length),
                                dirValue: attrValue,
                            }
                        });
                    }
                }
            }
            that.curNode = node;
            // 如果该节点还有子节点，递归调用shallowCompile遍历所有子节点
            if (node.childNodes) {
                that.shallowCompile();
            }
        });
        return this;
    }
    /**
     * parseExpression函数负责解析字符串表达式（目前只支持解析对象解引用表达式），将中缀表达式转化为后缀表达式
     * @returns 返回该Compiler对象引用
     */
    parseExpression() {
        const hook = this.mvvmInstance.hooks;
        hook.forEach((h) => {
            switch (h.type) {
                // 解析文本插值表达式，由于一个文本节点可以包含多个文本插值，因此一个节点会得到多个后缀表达式
                case 1 /* BindType.TextInterpolation */:
                    const strVariables = h.value.strVariables;
                    strVariables.forEach((str) => {
                        // 因为目前不支持解析表达式，所以所有空格都会被无视
                        const exp = (0, util_1.trimAllSpace)(str.slice(2, -2));
                        h.postfix.push(Compiler._toPostfix(exp, false));
                    });
                    break;
                // 解析节点属性值的表达式
                case 2 /* BindType.Directive */:
                    const directive = h.directive;
                    const name = directive.dirName, value = directive.dirValue;
                    if (name === "model" /* BuildInDirective.model */) {
                        h.postfix = Compiler._toPostfix(value, false);
                    }
                    break;
            }
        });
        return this;
    }
    /**
     * parseEventHandler函数通过parseExpression函数解析得到的后缀表达式生成回调函数
     */
    parseEventHandler() {
        const mvvm = this.mvvmInstance;
        const hook = this.mvvmInstance.hooks;
        let $data = this.mvvmInstance.$data;
        // 依次遍历hook保存的处理相关数据，根据前两部分（shallowCompile，parseExpression）处理的结果生成最终回调函数
        hook.forEach(function (h) {
            switch (h.type) {
                case 1 /* BindType.TextInterpolation */:
                    const length = h.value.strVariables.length;
                    h.subfuncs = new Array(length);
                    h.subvalues = new Array(length);
                    h.arranged = false;
                    // 每个文本节点的update函数负责更新文本节点内容
                    h.updateValue = function () {
                        if (!h.arranged) {
                            // update函数每个循环周期只需要执行一次，因此通过Promise.then方法添加到循环结束前的微任务队列中
                            Promise.resolve().then(function () {
                                let str = '';
                                // 连接文本节点的常量字符串和变量字符串得到更新后的文本内容
                                for (let i = 0; i < length; i++) {
                                    str = str + h.value.strConstants[i];
                                    str = str + h.subvalues[i];
                                }
                                str = str + h.value.strConstants[length];
                                h.domNode.nodeValue = str;
                                h.arranged = false;
                            });
                        }
                        h.arranged = true;
                    };
                    const postfixs = h.postfix;
                    const subfuncs = h.subfuncs, subvalues = h.subvalues;
                    // 遍历后缀表达式数组，获得数据访问路径，生成相应的回调函数
                    postfixs.forEach(function (postfix, index) {
                        subfuncs[index] = function () {
                            let result = h.value.strVariables[index];
                            if (postfix.length === 0) {
                                if (subvalues[index] != result) {
                                    subvalues[index] = result.toString();
                                    h.updateValue();
                                }
                                return result;
                            }
                            let stack = [];
                            result = $data[postfix[0]];
                            if (result !== undefined) {
                                stack.push(result);
                            }
                            else {
                                subvalues[index] = '';
                                h.updateValue();
                                return result;
                            }
                            // 通过_parsePostfix函数获得本次更新数据的新值
                            result = _parsePostfix(stack, postfix, 1);
                            if (result === undefined) {
                                subvalues[index] = '';
                                h.updateValue();
                                return result;
                            }
                            else {
                                if (subvalues[index] != result) {
                                    subvalues[index] = result.toString();
                                    h.updateValue();
                                }
                                return result;
                            }
                            /**
                                 * _parsePostfix内部函数负责get一个后缀表达式对应的数据的值
                                 *  @param stack 用来存放解析过程中的中间变量
                                 *  @param postfix 被解析的后缀表达式
                                 *  @param start 开始解析的索引值
                                 *  @returns 返回后缀表达式对应数据的值
                                 */
                            function _parsePostfix(stack, postfix, start) {
                                if (stack.length === 0) {
                                    stack.push($data[postfix[0]]);
                                    start++;
                                }
                                let len = postfix.length;
                                for (let i = start; i < len; i++) {
                                    let item = postfix[i];
                                    if (item === '.') {
                                        let second = stack.pop(), first = stack.pop();
                                        if (typeof (first) !== 'object') {
                                            return undefined;
                                        }
                                        let val;
                                        val = first[second];
                                        stack.push(val);
                                    }
                                    // 遇到子后缀表达式，递归求解
                                    else if ((0, util_2.typeNameOf)(item) === 'array') {
                                        let value = _parsePostfix([], item, 0);
                                        if (value === undefined) {
                                            return undefined;
                                        }
                                        stack.push(value);
                                    }
                                    else {
                                        stack.push(item);
                                    }
                                }
                                return stack[0];
                            }
                        };
                    });
                    break;
                // 这部分负责将指令操作DOM文档的回调函数绑定到相应的数据上
                case 2 /* BindType.Directive */:
                    let directive = h.directive, node = h.domNode, postfix = h.postfix;
                    let dirName = directive.dirName;
                    switch (dirName) {
                        // model指令（因为时间关系，目前仅实现model数据双向绑定一种指令）
                        case 'model':
                            if ((0, util_3.isFormInputElement)(node)) {
                                h.func = () => {
                                    if (postfix.length !== 0) {
                                        let stack = [], val;
                                        val = $data[postfix[0]];
                                        if (postfix.length !== 1) {
                                            stack.push(val);
                                            val = Compiler._parsePostfix(mvvm, stack, postfix, 1);
                                        }
                                        (0, util_1.setUserInputValue)(node, val);
                                    }
                                };
                                const event = (0, util_1.getEventName)(node);
                                node.addEventListener(event, function (e) {
                                    let len = postfix.length, result;
                                    const nodeValue = (0, util_1.getUserInputValue)(node);
                                    if (postfix.length !== 0) {
                                        let stack = [];
                                        if (len === 1) {
                                            $data[postfix[0]] = nodeValue;
                                        }
                                        stack.push($data[postfix[0]]);
                                        _parsePostfix(stack, postfix, 1, nodeValue, true);
                                    }
                                    /**
                                     * _parsePostfix内部函数负责set一个后缀表达式对应的数据
                                     *  @param stack 用来存放解析过程中的中间变量
                                     *  @param postfix 被解析的后缀表达式
                                     *  @param start 开始解析的索引值
                                     *  @param value 设置的新值
                                     *  @param final 是否是子后缀表达式
                                     *  @returns 如果子后缀表达式，返回计算的中间变量；否则返回undefined
                                     */
                                    function _parsePostfix(stack, postfix, start, value, final) {
                                        let initialState = start;
                                        if (stack.length === 0) {
                                            stack.push($data[postfix[0]]);
                                            start++;
                                        }
                                        let len = postfix.length;
                                        for (let i = start; i < len; i++) {
                                            let item = postfix[i];
                                            if (item === '.') {
                                                let second = stack.pop(), first = stack.pop();
                                                if (typeof (first) !== 'object') {
                                                    return;
                                                }
                                                // 如果是最后一个操作符并且不是子后缀表达式，将value的设置给$data
                                                if (i === len - 1 && final) {
                                                    first[second] = value;
                                                    return;
                                                }
                                                let val;
                                                val = first[second];
                                                stack.push(val);
                                            }
                                            else if ((0, util_2.typeNameOf)(item) === 'array') {
                                                let v = _parsePostfix([], item, 0, value, false);
                                                if (v === undefined) {
                                                    return;
                                                }
                                                stack.push(v);
                                            }
                                            else {
                                                stack.push(item);
                                            }
                                        }
                                        return stack[0];
                                    }
                                });
                            }
                            break;
                    }
                    break;
            }
        });
        return this;
    }
    /**
     * _toPostfix函数接受一个中缀表达式字符串，返回转化成的后缀表达式数组
     * @param infixExp 中缀表达式字符串
     * @param pattern 是否是子表达式
     * @returns 返回解析得到的后缀表达式，如果原始表达式不合法，则返回空数组
     */
    static _toPostfix(infixExp, pattern = false) {
        let results = [], operators = [];
        // 如果传入的是一个子表达式，则允许是一个由单双引号包围的字符串（对应JS方括号语法）
        if (pattern) {
            if (constants_2.JSStringReg.test(infixExp)) {
                /*/results.push(infixExp.slice(1,-1));
                return results;*/
                return infixExp.slice(1, -1);
            }
        }
        // 检验表达式是否合法，不合法直接返回空数组
        if (!constants_2.dereferenceExpressionReg.test(infixExp)) {
            return [];
        }
        let name = '', len = infixExp.length;
        let i = 0;
        // 遍历中缀字符串，找出属性名称和解引用操作符，按照后缀表达式顺序放入数组中
        while (i < len) {
            if (infixExp[i] !== '[' && infixExp[i] !== ']' && infixExp[i] !== '.') {
                name += infixExp[i];
            }
            else {
                if (name) {
                    results.push(name);
                    name = '';
                }
                if (infixExp[i] === '[') {
                    if (operators.length) {
                        results.push(operators.pop());
                    }
                    let j = i, count = 0;
                    while (i < len) {
                        if (infixExp[i] === '[') {
                            count++;
                        }
                        else if (infixExp[i] === ']') {
                            count--;
                        }
                        if (count === 0) {
                            break;
                        }
                        i++;
                    }
                    // 方括号里是子表达式，需要递归解析
                    const subPostfix = Compiler._toPostfix(infixExp.slice(j + 1, i), true);
                    if (typeof (subPostfix) === 'object' && subPostfix.length === 0) {
                        return [];
                    }
                    else {
                        results.push(subPostfix);
                        results.push('.');
                    }
                }
                else if (infixExp[i] === '.') {
                    if (operators.length) {
                        results.push(operators.pop());
                    }
                    operators.push(infixExp[i]);
                }
            }
            i++;
        }
        // 最后将最后一个属性名推入数组中
        if (name !== '') {
            results.push(name);
            if (results.length > 1) {
                results.push('.');
            }
        }
        return results;
    }
    static _parsePostfix(mvvm, stack, postfix, start) {
        const $data = mvvm.$data;
        if (stack.length === 0) {
            stack.push($data[postfix[0]]);
            start++;
        }
        let len = postfix.length;
        for (let i = start; i < len; i++) {
            let item = postfix[i];
            if (item === '.') {
                let second = stack.pop(), first = stack.pop();
                if (typeof (first) !== 'object') {
                    return undefined;
                }
                let val;
                val = first[second];
                stack.push(val);
            }
            // 遇到子后缀表达式，递归求解
            else if ((0, util_2.typeNameOf)(item) === 'array') {
                let value = Compiler._parsePostfix(mvvm, [], item, 0);
                if (value === undefined) {
                    return undefined;
                }
                stack.push(value);
            }
            else {
                stack.push(item);
            }
        }
        return stack[0];
    }
}
exports.Compiler = Compiler;


/***/ }),

/***/ "./src/core/observer/observe.ts":
/*!**************************************!*\
  !*** ./src/core/observer/observe.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Observe = void 0;
const constants_1 = __webpack_require__(/*! ../../constants */ "./src/constants.ts");
const register_1 = __webpack_require__(/*! ./register */ "./src/core/observer/register.ts");
const util_1 = __webpack_require__(/*! ../util */ "./src/core/util.ts");
/**
 * Observe类负责为应用数据定义代理行为
 */
class Observe {
    constructor(mvvm) {
        const behavior = Observe.getBehavior();
        mvvm.$data = this._proxyThis(mvvm.$data, behavior);
    }
    /**
     * _proxyThis函数：深度代理一个对象，如果一个对象包含子对象，则将子对象也替换为它的代理对象
     * @param obj 被代理的对象
     * @param behavior 代理对象和代理对象属性对象的代理行为
     * @returns 返回对象的代理对象
     */
    _proxyThis(obj, behavior) {
        const tName = (0, util_1.typeNameOf)(obj[constants_1.dataValueSymbol].value);
        if (tName === 'object') {
            const proxy = new Proxy(obj, behavior);
            const objKeys = Object.keys(obj);
            for (let i of objKeys) {
                const tName = (0, util_1.typeNameOf)(obj[i][constants_1.dataValueSymbol].value);
                if (tName === 'object') {
                    obj[i] = this._proxyThis(obj[i], behavior);
                }
            }
            return proxy;
        }
    }
    /**
     * 函数返回被绑定数据的行为
     * @returns 包含被代理对象的行为函数的对象
     */
    static getBehavior() {
        return {
            // 修改获取属性值的行为
            get: function (target, property) {
                // 如果获取的属性是保存原始对象的值和相关参数的属性，直接返回属性值，避免二次读取
                if (property === constants_1.dataValueSymbol) {
                    return target[property];
                }
                // 检测对象是否有此属性
                if (property in target) {
                    // 检测Register.target是否为空，不为空将其指向的Watcher添加到发布队列里
                    if (register_1.Register.target) {
                        target[property][constants_1.dataValueSymbol].dep.addWatcher(register_1.Register.target);
                    }
                    // 如果原对象的属性仍然是对象，则直接返回会得到该属性对象的代理对象，否则返回原属性值
                    if (target[property][constants_1.dataValueSymbol]['type'] === 'object') {
                        return target[property];
                    }
                    else {
                        return target[property][constants_1.dataValueSymbol]['value'];
                    }
                }
                return undefined;
            },
            // 修改属性值设定的行为
            set: function (target, property, newValue) {
                if (property in target) {
                    // 如果新值等于旧值，直接返回
                    if (newValue === target[property][constants_1.dataValueSymbol].value) {
                        return true;
                    }
                    // 设置属性值为新值，并通知所有订阅者执行回调函数
                    target[property][constants_1.dataValueSymbol].value = newValue;
                    target[property][constants_1.dataValueSymbol].dep.notify();
                    return true;
                }
                return false;
            }
        };
    }
}
exports.Observe = Observe;


/***/ }),

/***/ "./src/core/observer/register.ts":
/*!***************************************!*\
  !*** ./src/core/observer/register.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Register = void 0;
/**
 * Register类表示发布者：
 * 绑定的数据对象的每个属性都是一个发布者；
 * 当属性感受到自己的数值发生变化时，会通知挂载在它身上的每个订阅者，执行所有的回调函数
 * 当Register类的静态属性target不为空时，设定属性值时属性会把target指向的订阅者保存起来
 */
class Register {
    constructor() {
        this.watcherArray = [];
    }
    addWatcher(watcher) {
        this.watcherArray.push(watcher);
    }
    notify() {
        this.watcherArray.forEach((watcher) => {
            watcher.execute();
        });
    }
}
exports.Register = Register;


/***/ }),

/***/ "./src/core/observer/watcher.ts":
/*!**************************************!*\
  !*** ./src/core/observer/watcher.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Watcher = void 0;
/**
 * Watcher类用于表示一个完整的订阅：
 * private task：存放订阅触发时的回调函数
 * private args: 回调函数的参数
 * private context：可以通过该参数指定回调函数执行的上下文
 */
class Watcher {
    constructor(task, args, context) {
        this.task = task;
        this.args = args;
        this.context = context;
    }
    // 执行回调函数
    execute() {
        this.task.apply(this.context, this.args);
    }
}
exports.Watcher = Watcher;


/***/ }),

/***/ "./src/core/util.ts":
/*!**************************!*\
  !*** ./src/core/util.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deepClone = exports.setUserInputValue = exports.getUserInputValue = exports.getEventName = exports.isFormInputElement = exports.typeNameOf = exports.randomString = exports.trimAllSpace = void 0;
/**
 * 函数接受一个字符串参数，返回该字符串去掉所有空格后的字符串副本
 * @param str 去掉空格前的原字符串
 * @returns 返回结果字符串
 */
function trimAllSpace(str) {
    return str.replace(/\s*/g, "");
}
exports.trimAllSpace = trimAllSpace;
/**
 * 函数接受一个数值类型参数，返回一个长度为num的随机字符串
 * @param num 生成的随机字符串的长度
 * @returns 返回随机字符串
 */
function randomString(num = 128) {
    let i = 0, result = '';
    for (; i < num; i++) {
        let n = Math.floor(Math.random() * 26 + 97);
        result += String.fromCharCode(n);
    }
    return result;
}
exports.randomString = randomString;
/**
 * 函数接受一个任意类型的参数，返回参数的变量类型
 * @param obj 要被检测类型的变量
 * @returns 返回类型字符串
 */
function typeNameOf(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}
exports.typeNameOf = typeNameOf;
/**
 * 函数接受一个文档节点对象，检测这个节点是否允许双向绑定数据
 * @param node 要被检测的文档节点
 * @returns 返回检测结果
 */
function isFormInputElement(node) {
    const tagName = node.tagName;
    const n = tagName.toLowerCase();
    const t = node.getAttribute('type');
    if (n === 'textarea') {
        return true;
    }
    else if (n === 'input') {
        // 如果input不写type属性，默认是text输入框
        if (!t || t === 'select' || t === 'radio' || t === 'checkbox' || t === 'text') {
            return true;
        }
    }
    return false;
}
exports.isFormInputElement = isFormInputElement;
/**
 * getEventName函数：接受一个DOM元素节点，返回应该为他添加的事件类型
 * @param node 被添加事件监听器的节点
 * @returns 返回添加的事件类型字符串
 */
function getEventName(node) {
    const name = node.nodeName.toLowerCase();
    const type = node.getAttribute("type");
    if (name === 'textarea' || (name === 'input' && (type === 'text' || !type))) {
        return 'input';
    }
    else if (name === 'select') {
        return 'change';
    }
    else {
        return 'click';
    }
}
exports.getEventName = getEventName;
/**
 * getUserInputValue函数：接受一个DOM元素节点，返回节点包含的值
 * @param node 被添加事件监听器的节点
 * @returns 返回该节点的值
 */
function getUserInputValue(node) {
    const name = node.nodeName.toLowerCase();
    const type = node.getAttribute('type');
    let alias;
    switch (name) {
        case 'input':
            alias = node;
            if (!type || type === 'input') {
                return alias.value;
            }
            else {
                return alias.checked ? alias.value : '';
            }
        case 'select':
            alias = node;
            return alias.value;
        case 'textarea':
            alias = node;
            return alias.value;
        default:
            return '';
    }
}
exports.getUserInputValue = getUserInputValue;
/**
 * setUserInputValue函数：节点绑定的数据变化时，反馈到节点上
 * @param node 被添加事件监听器的节点
 * @param value 给该节点设置的值
 */
function setUserInputValue(node, value) {
    const str = value ? value.toString() : '';
    const name = node.nodeName.toLowerCase();
    if (name === 'select') {
        const select = node;
        const options = select.options;
        Array.from(options).some((op) => {
            if (op.value === str) {
                op.selected = true;
                return true;
            }
            return false;
        });
    }
    else if (name === 'input') {
        const type = node.getAttribute('type');
        const n = node;
        switch (type) {
            case 'radio':
            case 'checkbox':
                if (str === n.value) {
                    n.checked = true;
                }
                break;
            case null:
            case 'text':
                n.value = str;
                break;
        }
    }
    else if (name === 'textarea') {
        const n = node;
        n.value = str;
    }
}
exports.setUserInputValue = setUserInputValue;
/**
 *
 * @param obj 要被克隆的变量
 * @param map （可选）对变量和变量所有子属性（如果有）克隆后的新对应物的映射规则
 * @returns 克隆后的变量
 */
function deepClone(obj, map) {
    // attrSet保存已经被克隆过的对象引用，避免循环引用无限复制
    const attrSet = new Set();
    function _deepClone(obj) {
        let tName = typeNameOf(obj);
        switch (tName) {
            case 'null':
            case 'undefined':
            case 'boolean':
            case 'number':
            case 'string':
                return map ? map(obj) : obj;
            case 'symbol':
                let tmp = {};
                tmp[obj] = '';
                let syms = Object.getOwnPropertySymbols(tmp);
                return map ? map(syms[0]) : syms[0];
            case 'function':
                const f = new Function('return ' + obj)();
                return map ? map(f) : f;
            case 'date':
                const date = new Date(obj);
                return map ? map(date) : date;
            case 'regexp':
                const regexp = new RegExp(obj);
                return map ? map(regexp) : regexp;
            case 'set':
                const set = new Set(obj);
                return map ? map(set) : set;
            case 'map':
                const mapCopy = new Map(obj);
                return map ? map(mapCopy) : mapCopy;
            // 如果是数组或者对象，需要递归克隆
            case 'array':
            case 'object':
                // 如果该对象引用已经被添加到Set中，不需要深度克隆整个对象，仅需要克隆引用即可
                if (attrSet.has(obj)) {
                    return map ? map(obj) : obj;
                }
                attrSet.add(obj);
                let propName = Object.keys(obj);
                let propSymbol = Object.getOwnPropertySymbols(obj);
                let result = tName === 'array' ? [] : {};
                // 遍历对象的所有属性，依次复制
                for (let i of propName) {
                    result[i] = _deepClone(obj[i]);
                }
                for (let i of propSymbol) {
                    result[i] = _deepClone(obj[i]);
                }
                map ? map(result) : result;
                return result;
        }
    }
    return _deepClone(obj);
}
exports.deepClone = deepClone;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MVVM = void 0;
const constants_1 = __webpack_require__(/*! ./constants */ "./src/constants.ts");
const compiler_1 = __webpack_require__(/*! ./core/compile/compiler */ "./src/core/compile/compiler.ts");
const observe_1 = __webpack_require__(/*! ./core/observer/observe */ "./src/core/observer/observe.ts");
const register_1 = __webpack_require__(/*! ./core/observer/register */ "./src/core/observer/register.ts");
const watcher_1 = __webpack_require__(/*! ./core/observer/watcher */ "./src/core/observer/watcher.ts");
const util_1 = __webpack_require__(/*! ./core/util */ "./src/core/util.ts");
/**
 * MVVM类：MVVM框架主类
 * MVVM类负责创建新的应用，初始化数据，将应用挂载到DOM节点上，调用Compiler类编译文档，建立数据到文档节点的关系
 */
class MVVM {
    /**
     * MVVM类构造函数，接受一个包含所有应用需要的数据的对象，并对其初始化
     * @param options 初始化应用的数据对象
     */
    constructor(options) {
        this.hooks = [];
        this._data = options.data();
        this._computed = options.computed;
        this._watch = options.watch;
        this._methods = options.methods;
        // 将计算属性，方法属性，监听属性的方法全部转移到数据属性中，统一管理
        if (this._computed) {
            const computedAttr = Object.keys(this._computed);
            for (let i of computedAttr) {
                this._data[i] = this._computed[i];
            }
        }
        if (this._watch) {
            const computedAttr = Object.keys(this._watch);
            for (let i of computedAttr) {
                this._data[i] = this._watch[i];
            }
        }
        if (this._methods) {
            const computedAttr = Object.keys(this._methods);
            for (let i of computedAttr) {
                this._data[i] = this._methods[i];
            }
        }
        /**
         *  克隆数据属性，并扩展数据属性的每个属性值成为一个对象，对象中保存属性值，属性的发布者类，是否是基本类型等信息
         * 将属性名和属性的各项参数解耦，方便以后的扩展
         */
        this.$data = (0, util_1.deepClone)(this._data, (obj) => {
            const tName = (0, util_1.typeNameOf)(obj);
            if (tName === 'object' || tName === 'array') {
                Object.defineProperty(obj, constants_1.dataValueSymbol, {
                    enumerable: false,
                    configurable: false,
                    writable: true,
                    value: {
                        value: obj,
                        type: 'object',
                        dep: new register_1.Register(),
                    }
                });
                return;
            }
            return Object.defineProperty({}, constants_1.dataValueSymbol, {
                enumerable: false,
                configurable: false,
                writable: true,
                value: {
                    value: obj,
                    type: 'basic',
                    dep: new register_1.Register(),
                }
            });
        });
    }
    /**
     * mount将应用挂载到selectorCSS选择器选中的第一个DOM节点上，编译该节点，解析节点内包含的所有表达式，指令等
     * 将解析后得到的DOM操作函数挂载到相应数据的发布器上
     * @param selector DOM节点选择器字符串
     * @returns
     */
    mount(selector) {
        const compiler = new compiler_1.Compiler(selector, this);
        compiler.shallowCompile();
        compiler.parseExpression();
        new observe_1.Observe(this);
        compiler.parseEventHandler();
        this._init();
        //console.log(this);
        return this.$data;
    }
    /**
     * 初始化，将观察者绑定到数据上
     */
    _init() {
        const hook = this.hooks, data = this.$data;
        hook.forEach(function (h) {
            const type = h.type;
            switch (type) {
                // 数据绑定文本插值的回调函数
                case 1 /* BindType.TextInterpolation */:
                    h.subfuncs.forEach(function (fn) {
                        register_1.Register.target = new watcher_1.Watcher(fn, [], data);
                        fn();
                        register_1.Register.target = null;
                    });
                    break;
                // 绑定除model数据双向绑定指令外的指令处理函数（因为时间关系目前没有完成）
                case 2 /* BindType.Directive */:
                    /* 这里处理指令部分页面初始化 */
                    if (h.func) {
                        register_1.Register.target = new watcher_1.Watcher(h.func, [], data);
                        h.func();
                        register_1.Register.target = null;
                    }
                    break;
            }
        });
    }
}
exports.MVVM = MVVM;
let vm = new MVVM({
    data() {
        return {
            name: {
                first: 'Peiran',
                last: 'Qu'
            },
            title: {
                t1: 'Hello World!',
                t2: 'Hello World!!',
                t3: 'Hello World!!!'
            },
            titleIndex: {
                type: 't1',
            },
            vehicle: {
                bicycle: '',
                car: '',
                yacht: '',
                plane: ''
            }
        };
    }
});
let data = vm.mount("#app");
// 使用者直接通过mount返回的数据对象操作DOM
(function () {
    const period = 3;
    let phase = 1;
    setInterval(() => {
        switch (phase) {
            case 0:
                data.titleIndex.type = 't1';
                break;
            case 1:
                data.titleIndex.type = 't2';
                break;
            case 2:
                data.titleIndex.type = 't3';
                break;
        }
        phase++;
        phase = phase % period;
    }, 1500);
})();
data.vehicle['bicycle'] = '自行车 ';

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFhO0FBQ2IsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELHVCQUF1QixHQUFHLHVCQUF1QixHQUFHLGdDQUFnQyxHQUFHLG1CQUFtQixHQUFHLHdCQUF3QjtBQUNySSxlQUFlLG1CQUFPLENBQUMsdUNBQWE7QUFDcEM7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLE1BQU0sRUFBRSxLQUFLLEVBQUU7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQkFBbUIsVUFBVSxFQUFFLGNBQWMsR0FBRyxLQUFLLEVBQUU7QUFDdkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0M7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUI7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUI7Ozs7Ozs7Ozs7O0FDM0JWO0FBQ2IsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELGdCQUFnQjtBQUNoQixvQkFBb0IsbUJBQU8sQ0FBQywyQ0FBaUI7QUFDN0Msb0JBQW9CLG1CQUFPLENBQUMsMkNBQWlCO0FBQzdDLGVBQWUsbUJBQU8sQ0FBQyxtQ0FBUztBQUNoQyxlQUFlLG1CQUFPLENBQUMsbUNBQVM7QUFDaEMsZUFBZSxtQkFBTyxDQUFDLG1DQUFTO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0Msd0JBQXdCO0FBQ3hEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0RBQWdELFlBQVk7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvREFBb0QsU0FBUztBQUM3RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0REFBNEQsU0FBUztBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQztBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0I7QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixTQUFTO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCOzs7Ozs7Ozs7OztBQ3ZhSDtBQUNiLDhDQUE2QyxFQUFFLGFBQWEsRUFBQztBQUM3RCxlQUFlO0FBQ2Ysb0JBQW9CLG1CQUFPLENBQUMsMkNBQWlCO0FBQzdDLG1CQUFtQixtQkFBTyxDQUFDLG1EQUFZO0FBQ3ZDLGVBQWUsbUJBQU8sQ0FBQyxtQ0FBUztBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTs7Ozs7Ozs7Ozs7QUMvRUY7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxnQkFBZ0I7Ozs7Ozs7Ozs7O0FDdEJIO0FBQ2IsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTs7Ozs7Ozs7Ozs7QUNwQkY7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsaUJBQWlCLEdBQUcseUJBQXlCLEdBQUcseUJBQXlCLEdBQUcsb0JBQW9CLEdBQUcsMEJBQTBCLEdBQUcsa0JBQWtCLEdBQUcsb0JBQW9CLEdBQUcsb0JBQW9CO0FBQ2hNO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFNBQVM7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQjtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCO0FBQ2xCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQkFBMEI7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CO0FBQ3BCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjs7Ozs7OztVQy9NakI7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7Ozs7Ozs7OztBQ3RCYTtBQUNiLDhDQUE2QyxFQUFFLGFBQWEsRUFBQztBQUM3RCxZQUFZO0FBQ1osb0JBQW9CLG1CQUFPLENBQUMsdUNBQWE7QUFDekMsbUJBQW1CLG1CQUFPLENBQUMsK0RBQXlCO0FBQ3BELGtCQUFrQixtQkFBTyxDQUFDLCtEQUF5QjtBQUNuRCxtQkFBbUIsbUJBQU8sQ0FBQyxpRUFBMEI7QUFDckQsa0JBQWtCLG1CQUFPLENBQUMsK0RBQXlCO0FBQ25ELGVBQWUsbUJBQU8sQ0FBQyx1Q0FBYTtBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQSwyQ0FBMkM7QUFDM0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsQ0FBQztBQUNEIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdHlwZXNjcmlwdF9sZWFybi8uL3NyYy9jb25zdGFudHMudHMiLCJ3ZWJwYWNrOi8vdHlwZXNjcmlwdF9sZWFybi8uL3NyYy9jb3JlL2NvbXBpbGUvY29tcGlsZXIudHMiLCJ3ZWJwYWNrOi8vdHlwZXNjcmlwdF9sZWFybi8uL3NyYy9jb3JlL29ic2VydmVyL29ic2VydmUudHMiLCJ3ZWJwYWNrOi8vdHlwZXNjcmlwdF9sZWFybi8uL3NyYy9jb3JlL29ic2VydmVyL3JlZ2lzdGVyLnRzIiwid2VicGFjazovL3R5cGVzY3JpcHRfbGVhcm4vLi9zcmMvY29yZS9vYnNlcnZlci93YXRjaGVyLnRzIiwid2VicGFjazovL3R5cGVzY3JpcHRfbGVhcm4vLi9zcmMvY29yZS91dGlsLnRzIiwid2VicGFjazovL3R5cGVzY3JpcHRfbGVhcm4vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdHlwZXNjcmlwdF9sZWFybi8uL3NyYy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLmRhdGFWYWx1ZVN5bWJvbCA9IGV4cG9ydHMuZGlyZWN0aXZlUHJlZml4ID0gZXhwb3J0cy5kZXJlZmVyZW5jZUV4cHJlc3Npb25SZWcgPSBleHBvcnRzLkpTU3RyaW5nUmVnID0gZXhwb3J0cy5pbnRlcnBvbGF0aW9uUmVnID0gdm9pZCAwO1xyXG5jb25zdCB1dGlsXzEgPSByZXF1aXJlKFwiLi9jb3JlL3V0aWxcIik7XHJcbi8qKlxyXG4gKiDmlofmnKzmj5LlgLzmqKHlvI/mraPliJnooajovr7lvI9cclxuICovXHJcbmV4cG9ydHMuaW50ZXJwb2xhdGlvblJlZyA9IC9cXHtcXHsuKj9cXH1cXH0vZztcclxuLyoqXHJcbiAqIOaWueaLrOWPt+W8leeUqOWxnuaAp+WGmeazleato+WImeihqOi+vuW8j1xyXG4gKiBlLmcgJ2En5ZCI5rOV77ybYWJj6Z2e5rOVXHJcbiAqL1xyXG5leHBvcnRzLkpTU3RyaW5nUmVnID0gL15bJ1wiXXsxfVtBLVphLXowLTlfJF17MSx9WydcIl17MX0kLztcclxuLyoqXHJcbiAqIOWPmOmHj+W8leeUqOihqOi+vuW8j+eahOato+WImeihqOi+vuW8j++8iOS7heajgOa1i+esrOS4gOWxgu+8iVxyXG4gKiBlLmcgYVtiXeaYr+WQiOazleihqOi+vuW8j++8m2FbXeaYr+mdnuazleihqOi+vuW8j1xyXG4gKi9cclxuZXhwb3J0cy5kZXJlZmVyZW5jZUV4cHJlc3Npb25SZWcgPSAvXltBLVphLXowLTlfJF0rKD86KD86XFwuW0EtWmEtejAtOV8kXSspfCg/OlxcW1tBLVphLXowLTlfJC4nXCJcXFtcXF1dK1xcXSkpKiQvO1xyXG4vKipcclxuICog5oyH5Luk5Zu65a6a5YmN57yA5a2X56ym5LiyXHJcbiAqIGUuZyBtdnZtLW1vZGVs5piv5Y+M5ZCR57uR5a6a5pWw5o2u5oyH5LukXHJcbiAqL1xyXG5leHBvcnRzLmRpcmVjdGl2ZVByZWZpeCA9ICdtdnZtLSc7XHJcbi8qKlxyXG4gKiDkvZzkuLrlrZjmlL7nu5HlrprmlbDmja7mr4/kuKrlsZ7mgKfnmoTlsZ7mgKflgLzvvIzlsZ7mgKfnsbvlnovlkozorqLpmIXogIXpm4blkIjnmoTplK7lkI1cclxuICog6YCJ55Soc3ltYm9s6YG/5YWN5ZKM5Y6f5pWw5o2u5bey5pyJ55qE5bGe5oCn6YeN5aSNXHJcbiAqL1xyXG5leHBvcnRzLmRhdGFWYWx1ZVN5bWJvbCA9IFN5bWJvbC5mb3IoKDAsIHV0aWxfMS5yYW5kb21TdHJpbmcpKDEwKSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQ29tcGlsZXIgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4uLy4uL2NvbnN0YW50c1wiKTtcclxuY29uc3QgY29uc3RhbnRzXzIgPSByZXF1aXJlKFwiLi4vLi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB1dGlsXzEgPSByZXF1aXJlKFwiLi4vdXRpbFwiKTtcclxuY29uc3QgdXRpbF8yID0gcmVxdWlyZShcIi4uL3V0aWxcIik7XHJcbmNvbnN0IHV0aWxfMyA9IHJlcXVpcmUoXCIuLi91dGlsXCIpO1xyXG47XHJcbjtcclxuLyoqXHJcbiAqIENvbXBpbGVy57G777ya6LSf6LSj57yW6K+R5oyC6L295Zyo5bqU55So5LiK55qERE9N6IqC54K5XHJcbiAqL1xyXG5jbGFzcyBDb21waWxlciB7XHJcbiAgICAvKipcclxuICAgICAqIOS4gOS4qumAieaLqeWZqOS4gOS4quW6lOeUqOaehOW7uuWUr+S4gOS4gOS4qkNvbXBpbGVy5a+56LGhXHJcbiAgICAgKiBAcGFyYW0gc2VsZWN0b3IgRE9N6IqC54K56YCJ5oup5Zmo5a2X56ym5Liy77yM5ZGK6K+JQ29tcGlsZXLnvJbor5Hlk6rkuKroioLngrlcclxuICAgICAqIEBwYXJhbSBtdnZtIOW6lOeUqOWvueixoe+8jOWRiuiviUNvbXBpbGVy5Li65ZOq5Liq5bqU55So57yW6K+RXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yLCBtdnZtKSB7XHJcbiAgICAgICAgdGhpcy5tdnZtSW5zdGFuY2UgPSBtdnZtO1xyXG4gICAgICAgIHRoaXMubXZ2bUFuY2VzdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XHJcbiAgICAgICAgdGhpcy5jdXJOb2RlID0gdGhpcy5tdnZtQW5jZXN0b3I7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIOe8luivkURPTeiKgueCueWPiuWFtuaJgOacieWtkOiKgueCue+8jOaPkOWPluWSjOW6lOeUqOacieWFs+eahOaJgOacieWtl+espuS4su+8jOaMieeFp+S4gOWumuagvOW8j+S/neWtmOi1t+adpVxyXG4gICAgICogQHJldHVybnMg6L+U5ZueQ29tcGlsZXLlr7nosaHlvJXnlKjvvIzmlrnkvr/pk77lvI/osIPnlKhcclxuICAgICAqL1xyXG4gICAgc2hhbGxvd0NvbXBpbGUoKSB7XHJcbiAgICAgICAgY29uc3QgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgY29uc3QgYW5jZXN0b3IgPSB0aGlzLmN1ck5vZGU7XHJcbiAgICAgICAgY29uc3QgbXZ2bSA9IHRoaXMubXZ2bUluc3RhbmNlO1xyXG4gICAgICAgIC8vIOiKgueCueS4jeWtmOWcqOebtOaOpei/lOWbnlxyXG4gICAgICAgIGlmICghYW5jZXN0b3IpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOWwhuiKgueCueeahOWtkOiKgueCuei9rOWMluS4uuaVsOe7hOmBjeWOhue8luivkVxyXG4gICAgICAgIEFycmF5LmZyb20oYW5jZXN0b3IuY2hpbGROb2RlcykuZm9yRWFjaChmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVtZW50VHlwZSA9IG5vZGUubm9kZVR5cGU7XHJcbiAgICAgICAgICAgIC8vIG5vZGXoioLngrnnsbvlnovlgLznrYnkuo4z77yM5piv5paH5pys6IqC54K5XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50VHlwZSA9PT0gMykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IG5vZGUubm9kZVZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEoY29udGVudCAmJiBjb25zdGFudHNfMS5pbnRlcnBvbGF0aW9uUmVnLnRlc3QoY29udGVudCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8g5Yy56YWN56ym5ZCI5paH5pys5o+S5YC85qC85byP55qE5omA5pyJ5a2Q5a2X56ym5Liy5Lul5Y+K5paH5pys5Lit55qE5Zu65a6a5YC86YOo5YiG77yM5L+d5a2Y5Zyo5pWw57uE5LitXHJcbiAgICAgICAgICAgICAgICBsZXQgbWF0Y2hlcyA9IGNvbnRlbnQubWF0Y2goY29uc3RhbnRzXzEuaW50ZXJwb2xhdGlvblJlZyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnN0YW50cyA9IGNvbnRlbnQuc3BsaXQoY29uc3RhbnRzXzEuaW50ZXJwb2xhdGlvblJlZyk7XHJcbiAgICAgICAgICAgICAgICBtdnZtLmhvb2tzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGRvbU5vZGU6IG5vZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogMSAvKiBCaW5kVHlwZS5UZXh0SW50ZXJwb2xhdGlvbiAqLyxcclxuICAgICAgICAgICAgICAgICAgICBwb3N0Zml4OiBbXSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJDb25zdGFudHM6IHRleHRDb25zdGFudHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0clZhcmlhYmxlczogbWF0Y2hlcyxcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBub2Rl6IqC54K557G75Z6L5YC8562J5LqOMe+8jOaYr0hUTUzlhYPntKDoioLngrlcclxuICAgICAgICAgICAgZWxzZSBpZiAoZWxlbWVudFR5cGUgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIOmBjeWOhkhUTUzlhYPntKDnmoTmiYDmnInlsZ7mgKfvvIzmib7lh7rnrKblkIhNVlZN5oyH5Luk5qC85byP55qE5bGe5oCn5ZCNXHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlQXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICBsZXQgbm9kZUF0dHJBcnIgPSBBcnJheS5mcm9tKG5vZGVBdHRycyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVBdHRyQXJyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZSA9IG5vZGVBdHRyQXJyW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJOYW1lID0gYXR0cmlidXRlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0clZhbHVlID0gYXR0cmlidXRlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRyTmFtZS5zdGFydHNXaXRoKGNvbnN0YW50c18xLmRpcmVjdGl2ZVByZWZpeCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbXZ2bS5ob29rcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvbU5vZGU6IG5vZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAyIC8qIEJpbmRUeXBlLkRpcmVjdGl2ZSAqLyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc3RmaXg6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aXZlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyTmFtZTogYXR0ck5hbWUuc2xpY2UoY29uc3RhbnRzXzEuZGlyZWN0aXZlUHJlZml4Lmxlbmd0aCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyVmFsdWU6IGF0dHJWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQuY3VyTm9kZSA9IG5vZGU7XHJcbiAgICAgICAgICAgIC8vIOWmguaenOivpeiKgueCuei/mOacieWtkOiKgueCue+8jOmAkuW9kuiwg+eUqHNoYWxsb3dDb21waWxl6YGN5Y6G5omA5pyJ5a2Q6IqC54K5XHJcbiAgICAgICAgICAgIGlmIChub2RlLmNoaWxkTm9kZXMpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuc2hhbGxvd0NvbXBpbGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBwYXJzZUV4cHJlc3Npb27lh73mlbDotJ/otKPop6PmnpDlrZfnrKbkuLLooajovr7lvI/vvIjnm67liY3lj6rmlK/mjIHop6PmnpDlr7nosaHop6PlvJXnlKjooajovr7lvI/vvInvvIzlsIbkuK3nvIDooajovr7lvI/ovazljJbkuLrlkI7nvIDooajovr7lvI9cclxuICAgICAqIEByZXR1cm5zIOi/lOWbnuivpUNvbXBpbGVy5a+56LGh5byV55SoXHJcbiAgICAgKi9cclxuICAgIHBhcnNlRXhwcmVzc2lvbigpIHtcclxuICAgICAgICBjb25zdCBob29rID0gdGhpcy5tdnZtSW5zdGFuY2UuaG9va3M7XHJcbiAgICAgICAgaG9vay5mb3JFYWNoKChoKSA9PiB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoaC50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDop6PmnpDmlofmnKzmj5LlgLzooajovr7lvI/vvIznlLHkuo7kuIDkuKrmlofmnKzoioLngrnlj6/ku6XljIXlkKvlpJrkuKrmlofmnKzmj5LlgLzvvIzlm6DmraTkuIDkuKroioLngrnkvJrlvpfliLDlpJrkuKrlkI7nvIDooajovr7lvI9cclxuICAgICAgICAgICAgICAgIGNhc2UgMSAvKiBCaW5kVHlwZS5UZXh0SW50ZXJwb2xhdGlvbiAqLzpcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJWYXJpYWJsZXMgPSBoLnZhbHVlLnN0clZhcmlhYmxlcztcclxuICAgICAgICAgICAgICAgICAgICBzdHJWYXJpYWJsZXMuZm9yRWFjaCgoc3RyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWboOS4uuebruWJjeS4jeaUr+aMgeino+aekOihqOi+vuW8j++8jOaJgOS7peaJgOacieepuuagvOmDveS8muiiq+aXoOinhlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHAgPSAoMCwgdXRpbF8xLnRyaW1BbGxTcGFjZSkoc3RyLnNsaWNlKDIsIC0yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgucG9zdGZpeC5wdXNoKENvbXBpbGVyLl90b1Bvc3RmaXgoZXhwLCBmYWxzZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgLy8g6Kej5p6Q6IqC54K55bGe5oCn5YC855qE6KGo6L6+5byPXHJcbiAgICAgICAgICAgICAgICBjYXNlIDIgLyogQmluZFR5cGUuRGlyZWN0aXZlICovOlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGguZGlyZWN0aXZlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBkaXJlY3RpdmUuZGlyTmFtZSwgdmFsdWUgPSBkaXJlY3RpdmUuZGlyVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwibW9kZWxcIiAvKiBCdWlsZEluRGlyZWN0aXZlLm1vZGVsICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgucG9zdGZpeCA9IENvbXBpbGVyLl90b1Bvc3RmaXgodmFsdWUsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogcGFyc2VFdmVudEhhbmRsZXLlh73mlbDpgJrov4dwYXJzZUV4cHJlc3Npb27lh73mlbDop6PmnpDlvpfliLDnmoTlkI7nvIDooajovr7lvI/nlJ/miJDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgcGFyc2VFdmVudEhhbmRsZXIoKSB7XHJcbiAgICAgICAgY29uc3QgbXZ2bSA9IHRoaXMubXZ2bUluc3RhbmNlO1xyXG4gICAgICAgIGNvbnN0IGhvb2sgPSB0aGlzLm12dm1JbnN0YW5jZS5ob29rcztcclxuICAgICAgICBsZXQgJGRhdGEgPSB0aGlzLm12dm1JbnN0YW5jZS4kZGF0YTtcclxuICAgICAgICAvLyDkvp3mrKHpgY3ljoZob29r5L+d5a2Y55qE5aSE55CG55u45YWz5pWw5o2u77yM5qC55o2u5YmN5Lik6YOo5YiG77yIc2hhbGxvd0NvbXBpbGXvvIxwYXJzZUV4cHJlc3Npb27vvInlpITnkIbnmoTnu5PmnpznlJ/miJDmnIDnu4jlm57osIPlh73mlbBcclxuICAgICAgICBob29rLmZvckVhY2goZnVuY3Rpb24gKGgpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChoLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMSAvKiBCaW5kVHlwZS5UZXh0SW50ZXJwb2xhdGlvbiAqLzpcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGggPSBoLnZhbHVlLnN0clZhcmlhYmxlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaC5zdWJmdW5jcyA9IG5ldyBBcnJheShsZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGguc3VidmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaC5hcnJhbmdlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOavj+S4quaWh+acrOiKgueCueeahHVwZGF0ZeWHveaVsOi0n+i0o+abtOaWsOaWh+acrOiKgueCueWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgIGgudXBkYXRlVmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaC5hcnJhbmdlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRl5Ye95pWw5q+P5Liq5b6q546v5ZGo5pyf5Y+q6ZyA6KaB5omn6KGM5LiA5qyh77yM5Zug5q2k6YCa6L+HUHJvbWlzZS50aGVu5pa55rOV5re75Yqg5Yiw5b6q546v57uT5p2f5YmN55qE5b6u5Lu75Yqh6Zif5YiX5LitXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RyID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6L+e5o6l5paH5pys6IqC54K555qE5bi46YeP5a2X56ym5Liy5ZKM5Y+Y6YeP5a2X56ym5Liy5b6X5Yiw5pu05paw5ZCO55qE5paH5pys5YaF5a65XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgPSBzdHIgKyBoLnZhbHVlLnN0ckNvbnN0YW50c1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyID0gc3RyICsgaC5zdWJ2YWx1ZXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciA9IHN0ciArIGgudmFsdWUuc3RyQ29uc3RhbnRzW2xlbmd0aF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC5kb21Ob2RlLm5vZGVWYWx1ZSA9IHN0cjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmFycmFuZ2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoLmFycmFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvc3RmaXhzID0gaC5wb3N0Zml4O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YmZ1bmNzID0gaC5zdWJmdW5jcywgc3VidmFsdWVzID0gaC5zdWJ2YWx1ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6YGN5Y6G5ZCO57yA6KGo6L6+5byP5pWw57uE77yM6I635b6X5pWw5o2u6K6/6Zeu6Lev5b6E77yM55Sf5oiQ55u45bqU55qE5Zue6LCD5Ye95pWwXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zdGZpeHMuZm9yRWFjaChmdW5jdGlvbiAocG9zdGZpeCwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3ViZnVuY3NbaW5kZXhdID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IGgudmFsdWUuc3RyVmFyaWFibGVzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3N0Zml4Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWJ2YWx1ZXNbaW5kZXhdICE9IHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJ2YWx1ZXNbaW5kZXhdID0gcmVzdWx0LnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgudXBkYXRlVmFsdWUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGFjayA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJGRhdGFbcG9zdGZpeFswXV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJ2YWx1ZXNbaW5kZXhdID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaC51cGRhdGVWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpgJrov4dfcGFyc2VQb3N0Zml45Ye95pWw6I635b6X5pys5qyh5pu05paw5pWw5o2u55qE5paw5YC8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBfcGFyc2VQb3N0Zml4KHN0YWNrLCBwb3N0Zml4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnZhbHVlc1tpbmRleF0gPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLnVwZGF0ZVZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWJ2YWx1ZXNbaW5kZXhdICE9IHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJ2YWx1ZXNbaW5kZXhdID0gcmVzdWx0LnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgudXBkYXRlVmFsdWUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIF9wYXJzZVBvc3RmaXjlhoXpg6jlh73mlbDotJ/otKNnZXTkuIDkuKrlkI7nvIDooajovr7lvI/lr7nlupTnmoTmlbDmja7nmoTlgLxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHBhcmFtIHN0YWNrIOeUqOadpeWtmOaUvuino+aekOi/h+eoi+S4reeahOS4remXtOWPmOmHj1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqICBAcGFyYW0gcG9zdGZpeCDooqvop6PmnpDnmoTlkI7nvIDooajovr7lvI9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHBhcmFtIHN0YXJ0IOW8gOWni+ino+aekOeahOe0ouW8leWAvFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqICBAcmV0dXJucyDov5Tlm57lkI7nvIDooajovr7lvI/lr7nlupTmlbDmja7nmoTlgLxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9wYXJzZVBvc3RmaXgoc3RhY2ssIHBvc3RmaXgsIHN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKCRkYXRhW3Bvc3RmaXhbMF1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxlbiA9IHBvc3RmaXgubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtID0gcG9zdGZpeFtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICcuJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlY29uZCA9IHN0YWNrLnBvcCgpLCBmaXJzdCA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAoZmlyc3QpICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gZmlyc3Rbc2Vjb25kXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godmFsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpgYfliLDlrZDlkI7nvIDooajovr7lvI/vvIzpgJLlvZLmsYLop6NcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKDAsIHV0aWxfMi50eXBlTmFtZU9mKShpdGVtKSA9PT0gJ2FycmF5Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gX3BhcnNlUG9zdGZpeChbXSwgaXRlbSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2goaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YWNrWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgLy8g6L+Z6YOo5YiG6LSf6LSj5bCG5oyH5Luk5pON5L2cRE9N5paH5qGj55qE5Zue6LCD5Ye95pWw57uR5a6a5Yiw55u45bqU55qE5pWw5o2u5LiKXHJcbiAgICAgICAgICAgICAgICBjYXNlIDIgLyogQmluZFR5cGUuRGlyZWN0aXZlICovOlxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3RpdmUgPSBoLmRpcmVjdGl2ZSwgbm9kZSA9IGguZG9tTm9kZSwgcG9zdGZpeCA9IGgucG9zdGZpeDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlyTmFtZSA9IGRpcmVjdGl2ZS5kaXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZGlyTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBtb2RlbOaMh+S7pO+8iOWboOS4uuaXtumXtOWFs+ezu++8jOebruWJjeS7heWunueOsG1vZGVs5pWw5o2u5Y+M5ZCR57uR5a6a5LiA56eN5oyH5Luk77yJXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vZGVsJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoMCwgdXRpbF8zLmlzRm9ybUlucHV0RWxlbWVudCkobm9kZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoLmZ1bmMgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3N0Zml4Lmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YWNrID0gW10sIHZhbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICRkYXRhW3Bvc3RmaXhbMF1dO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvc3RmaXgubGVuZ3RoICE9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IENvbXBpbGVyLl9wYXJzZVBvc3RmaXgobXZ2bSwgc3RhY2ssIHBvc3RmaXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDAsIHV0aWxfMS5zZXRVc2VySW5wdXRWYWx1ZSkobm9kZSwgdmFsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSAoMCwgdXRpbF8xLmdldEV2ZW50TmFtZSkobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGVuID0gcG9zdGZpeC5sZW5ndGgsIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZVZhbHVlID0gKDAsIHV0aWxfMS5nZXRVc2VySW5wdXRWYWx1ZSkobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3N0Zml4Lmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YWNrID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobGVuID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRhdGFbcG9zdGZpeFswXV0gPSBub2RlVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKCRkYXRhW3Bvc3RmaXhbMF1dKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9wYXJzZVBvc3RmaXgoc3RhY2ssIHBvc3RmaXgsIDEsIG5vZGVWYWx1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIF9wYXJzZVBvc3RmaXjlhoXpg6jlh73mlbDotJ/otKNzZXTkuIDkuKrlkI7nvIDooajovr7lvI/lr7nlupTnmoTmlbDmja5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogIEBwYXJhbSBzdGFjayDnlKjmnaXlrZjmlL7op6PmnpDov4fnqIvkuK3nmoTkuK3pl7Tlj5jph49cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogIEBwYXJhbSBwb3N0Zml4IOiiq+ino+aekOeahOWQjue8gOihqOi+vuW8j1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHBhcmFtIHN0YXJ0IOW8gOWni+ino+aekOeahOe0ouW8leWAvFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHBhcmFtIHZhbHVlIOiuvue9rueahOaWsOWAvFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHBhcmFtIGZpbmFsIOaYr+WQpuaYr+WtkOWQjue8gOihqOi+vuW8j1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiAgQHJldHVybnMg5aaC5p6c5a2Q5ZCO57yA6KGo6L6+5byP77yM6L+U5Zue6K6h566X55qE5Lit6Ze05Y+Y6YeP77yb5ZCm5YiZ6L+U5ZuedW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBfcGFyc2VQb3N0Zml4KHN0YWNrLCBwb3N0Zml4LCBzdGFydCwgdmFsdWUsIGZpbmFsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5pdGlhbFN0YXRlID0gc3RhcnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhY2subGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaCgkZGF0YVtwb3N0Zml4WzBdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsZW4gPSBwb3N0Zml4Lmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBwb3N0Zml4W2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtID09PSAnLicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNlY29uZCA9IHN0YWNrLnBvcCgpLCBmaXJzdCA9IHN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChmaXJzdCkgIT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5piv5pyA5ZCO5LiA5Liq5pON5L2c56ym5bm25LiU5LiN5piv5a2Q5ZCO57yA6KGo6L6+5byP77yM5bCGdmFsdWXnmoTorr7nva7nu5kkZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbGVuIC0gMSAmJiBmaW5hbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Rbc2Vjb25kXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGZpcnN0W3NlY29uZF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnB1c2godmFsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKDAsIHV0aWxfMi50eXBlTmFtZU9mKShpdGVtKSA9PT0gJ2FycmF5Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdiA9IF9wYXJzZVBvc3RmaXgoW10sIGl0ZW0sIDAsIHZhbHVlLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhY2tbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBfdG9Qb3N0Zml45Ye95pWw5o6l5Y+X5LiA5Liq5Lit57yA6KGo6L6+5byP5a2X56ym5Liy77yM6L+U5Zue6L2s5YyW5oiQ55qE5ZCO57yA6KGo6L6+5byP5pWw57uEXHJcbiAgICAgKiBAcGFyYW0gaW5maXhFeHAg5Lit57yA6KGo6L6+5byP5a2X56ym5LiyXHJcbiAgICAgKiBAcGFyYW0gcGF0dGVybiDmmK/lkKbmmK/lrZDooajovr7lvI9cclxuICAgICAqIEByZXR1cm5zIOi/lOWbnuino+aekOW+l+WIsOeahOWQjue8gOihqOi+vuW8j++8jOWmguaenOWOn+Wni+ihqOi+vuW8j+S4jeWQiOazle+8jOWImei/lOWbnuepuuaVsOe7hFxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgX3RvUG9zdGZpeChpbmZpeEV4cCwgcGF0dGVybiA9IGZhbHNlKSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdHMgPSBbXSwgb3BlcmF0b3JzID0gW107XHJcbiAgICAgICAgLy8g5aaC5p6c5Lyg5YWl55qE5piv5LiA5Liq5a2Q6KGo6L6+5byP77yM5YiZ5YWB6K645piv5LiA5Liq55Sx5Y2V5Y+M5byV5Y+35YyF5Zu055qE5a2X56ym5Liy77yI5a+55bqUSlPmlrnmi6zlj7for63ms5XvvIlcclxuICAgICAgICBpZiAocGF0dGVybikge1xyXG4gICAgICAgICAgICBpZiAoY29uc3RhbnRzXzIuSlNTdHJpbmdSZWcudGVzdChpbmZpeEV4cCkpIHtcclxuICAgICAgICAgICAgICAgIC8qL3Jlc3VsdHMucHVzaChpbmZpeEV4cC5zbGljZSgxLC0xKSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0czsqL1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluZml4RXhwLnNsaWNlKDEsIC0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyDmo4Dpqozooajovr7lvI/mmK/lkKblkIjms5XvvIzkuI3lkIjms5Xnm7TmjqXov5Tlm57nqbrmlbDnu4RcclxuICAgICAgICBpZiAoIWNvbnN0YW50c18yLmRlcmVmZXJlbmNlRXhwcmVzc2lvblJlZy50ZXN0KGluZml4RXhwKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBuYW1lID0gJycsIGxlbiA9IGluZml4RXhwLmxlbmd0aDtcclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgLy8g6YGN5Y6G5Lit57yA5a2X56ym5Liy77yM5om+5Ye65bGe5oCn5ZCN56ew5ZKM6Kej5byV55So5pON5L2c56ym77yM5oyJ54Wn5ZCO57yA6KGo6L6+5byP6aG65bqP5pS+5YWl5pWw57uE5LitXHJcbiAgICAgICAgd2hpbGUgKGkgPCBsZW4pIHtcclxuICAgICAgICAgICAgaWYgKGluZml4RXhwW2ldICE9PSAnWycgJiYgaW5maXhFeHBbaV0gIT09ICddJyAmJiBpbmZpeEV4cFtpXSAhPT0gJy4nKSB7XHJcbiAgICAgICAgICAgICAgICBuYW1lICs9IGluZml4RXhwW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gobmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGluZml4RXhwW2ldID09PSAnWycpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BlcmF0b3JzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gob3BlcmF0b3JzLnBvcCgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGogPSBpLCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBsZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZml4RXhwW2ldID09PSAnWycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoaW5maXhFeHBbaV0gPT09ICddJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pa55ous5Y+36YeM5piv5a2Q6KGo6L6+5byP77yM6ZyA6KaB6YCS5b2S6Kej5p6QXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViUG9zdGZpeCA9IENvbXBpbGVyLl90b1Bvc3RmaXgoaW5maXhFeHAuc2xpY2UoaiArIDEsIGkpLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChzdWJQb3N0Zml4KSA9PT0gJ29iamVjdCcgJiYgc3ViUG9zdGZpeC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHN1YlBvc3RmaXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goJy4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpbmZpeEV4cFtpXSA9PT0gJy4nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wZXJhdG9ycy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKG9wZXJhdG9ycy5wb3AoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdG9ycy5wdXNoKGluZml4RXhwW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIOacgOWQjuWwhuacgOWQjuS4gOS4quWxnuaAp+WQjeaOqOWFpeaVsOe7hOS4rVxyXG4gICAgICAgIGlmIChuYW1lICE9PSAnJykge1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2gobmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCgnLicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIF9wYXJzZVBvc3RmaXgobXZ2bSwgc3RhY2ssIHBvc3RmaXgsIHN0YXJ0KSB7XHJcbiAgICAgICAgY29uc3QgJGRhdGEgPSBtdnZtLiRkYXRhO1xyXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgc3RhY2sucHVzaCgkZGF0YVtwb3N0Zml4WzBdXSk7XHJcbiAgICAgICAgICAgIHN0YXJ0Kys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBsZW4gPSBwb3N0Zml4Lmxlbmd0aDtcclxuICAgICAgICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgaXRlbSA9IHBvc3RmaXhbaV07XHJcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnLicpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzZWNvbmQgPSBzdGFjay5wb3AoKSwgZmlyc3QgPSBzdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgKGZpcnN0KSAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IHZhbDtcclxuICAgICAgICAgICAgICAgIHZhbCA9IGZpcnN0W3NlY29uZF07XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKHZhbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g6YGH5Yiw5a2Q5ZCO57yA6KGo6L6+5byP77yM6YCS5b2S5rGC6KejXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKCgwLCB1dGlsXzIudHlwZU5hbWVPZikoaXRlbSkgPT09ICdhcnJheScpIHtcclxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IENvbXBpbGVyLl9wYXJzZVBvc3RmaXgobXZ2bSwgW10sIGl0ZW0sIDApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGFjay5wdXNoKGl0ZW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdGFja1swXTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkNvbXBpbGVyID0gQ29tcGlsZXI7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuT2JzZXJ2ZSA9IHZvaWQgMDtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi4vLi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCByZWdpc3Rlcl8xID0gcmVxdWlyZShcIi4vcmVnaXN0ZXJcIik7XHJcbmNvbnN0IHV0aWxfMSA9IHJlcXVpcmUoXCIuLi91dGlsXCIpO1xyXG4vKipcclxuICogT2JzZXJ2Zeexu+i0n+i0o+S4uuW6lOeUqOaVsOaNruWumuS5ieS7o+eQhuihjOS4ulxyXG4gKi9cclxuY2xhc3MgT2JzZXJ2ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihtdnZtKSB7XHJcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBPYnNlcnZlLmdldEJlaGF2aW9yKCk7XHJcbiAgICAgICAgbXZ2bS4kZGF0YSA9IHRoaXMuX3Byb3h5VGhpcyhtdnZtLiRkYXRhLCBiZWhhdmlvcik7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIF9wcm94eVRoaXPlh73mlbDvvJrmt7Hluqbku6PnkIbkuIDkuKrlr7nosaHvvIzlpoLmnpzkuIDkuKrlr7nosaHljIXlkKvlrZDlr7nosaHvvIzliJnlsIblrZDlr7nosaHkuZ/mm7/mjaLkuLrlroPnmoTku6PnkIblr7nosaFcclxuICAgICAqIEBwYXJhbSBvYmog6KKr5Luj55CG55qE5a+56LGhXHJcbiAgICAgKiBAcGFyYW0gYmVoYXZpb3Ig5Luj55CG5a+56LGh5ZKM5Luj55CG5a+56LGh5bGe5oCn5a+56LGh55qE5Luj55CG6KGM5Li6XHJcbiAgICAgKiBAcmV0dXJucyDov5Tlm57lr7nosaHnmoTku6PnkIblr7nosaFcclxuICAgICAqL1xyXG4gICAgX3Byb3h5VGhpcyhvYmosIGJlaGF2aW9yKSB7XHJcbiAgICAgICAgY29uc3QgdE5hbWUgPSAoMCwgdXRpbF8xLnR5cGVOYW1lT2YpKG9ialtjb25zdGFudHNfMS5kYXRhVmFsdWVTeW1ib2xdLnZhbHVlKTtcclxuICAgICAgICBpZiAodE5hbWUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb3h5ID0gbmV3IFByb3h5KG9iaiwgYmVoYXZpb3IpO1xyXG4gICAgICAgICAgICBjb25zdCBvYmpLZXlzID0gT2JqZWN0LmtleXMob2JqKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBvZiBvYmpLZXlzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0TmFtZSA9ICgwLCB1dGlsXzEudHlwZU5hbWVPZikob2JqW2ldW2NvbnN0YW50c18xLmRhdGFWYWx1ZVN5bWJvbF0udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHROYW1lID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIG9ialtpXSA9IHRoaXMuX3Byb3h5VGhpcyhvYmpbaV0sIGJlaGF2aW9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcHJveHk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiDlh73mlbDov5Tlm57ooqvnu5HlrprmlbDmja7nmoTooYzkuLpcclxuICAgICAqIEByZXR1cm5zIOWMheWQq+iiq+S7o+eQhuWvueixoeeahOihjOS4uuWHveaVsOeahOWvueixoVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgZ2V0QmVoYXZpb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLy8g5L+u5pS56I635Y+W5bGe5oCn5YC855qE6KGM5Li6XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKHRhcmdldCwgcHJvcGVydHkpIHtcclxuICAgICAgICAgICAgICAgIC8vIOWmguaenOiOt+WPlueahOWxnuaAp+aYr+S/neWtmOWOn+Wni+WvueixoeeahOWAvOWSjOebuOWFs+WPguaVsOeahOWxnuaAp++8jOebtOaOpei/lOWbnuWxnuaAp+WAvO+8jOmBv+WFjeS6jOasoeivu+WPllxyXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSBjb25zdGFudHNfMS5kYXRhVmFsdWVTeW1ib2wpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIOajgOa1i+WvueixoeaYr+WQpuacieatpOWxnuaAp1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5IGluIHRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOa1i1JlZ2lzdGVyLnRhcmdldOaYr+WQpuS4uuepuu+8jOS4jeS4uuepuuWwhuWFtuaMh+WQkeeahFdhdGNoZXLmt7vliqDliLDlj5HluIPpmJ/liJfph4xcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJfMS5SZWdpc3Rlci50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BlcnR5XVtjb25zdGFudHNfMS5kYXRhVmFsdWVTeW1ib2xdLmRlcC5hZGRXYXRjaGVyKHJlZ2lzdGVyXzEuUmVnaXN0ZXIudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5Y6f5a+56LGh55qE5bGe5oCn5LuN54S25piv5a+56LGh77yM5YiZ55u05o6l6L+U5Zue5Lya5b6X5Yiw6K+l5bGe5oCn5a+56LGh55qE5Luj55CG5a+56LGh77yM5ZCm5YiZ6L+U5Zue5Y6f5bGe5oCn5YC8XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldFtwcm9wZXJ0eV1bY29uc3RhbnRzXzEuZGF0YVZhbHVlU3ltYm9sXVsndHlwZSddID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldW2NvbnN0YW50c18xLmRhdGFWYWx1ZVN5bWJvbF1bJ3ZhbHVlJ107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8g5L+u5pS55bGe5oCn5YC86K6+5a6a55qE6KGM5Li6XHJcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHRhcmdldCwgcHJvcGVydHksIG5ld1ZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkgaW4gdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5paw5YC8562J5LqO5pen5YC877yM55u05o6l6L+U5ZueXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlID09PSB0YXJnZXRbcHJvcGVydHldW2NvbnN0YW50c18xLmRhdGFWYWx1ZVN5bWJvbF0udmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiuvue9ruWxnuaAp+WAvOS4uuaWsOWAvO+8jOW5tumAmuefpeaJgOacieiuoumYheiAheaJp+ihjOWbnuiwg+WHveaVsFxyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV1bY29uc3RhbnRzXzEuZGF0YVZhbHVlU3ltYm9sXS52YWx1ZSA9IG5ld1ZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV1bY29uc3RhbnRzXzEuZGF0YVZhbHVlU3ltYm9sXS5kZXAubm90aWZ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuT2JzZXJ2ZSA9IE9ic2VydmU7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuUmVnaXN0ZXIgPSB2b2lkIDA7XHJcbi8qKlxyXG4gKiBSZWdpc3Rlcuexu+ihqOekuuWPkeW4g+iAhe+8mlxyXG4gKiDnu5HlrprnmoTmlbDmja7lr7nosaHnmoTmr4/kuKrlsZ7mgKfpg73mmK/kuIDkuKrlj5HluIPogIXvvJtcclxuICog5b2T5bGe5oCn5oSf5Y+X5Yiw6Ieq5bex55qE5pWw5YC85Y+R55Sf5Y+Y5YyW5pe277yM5Lya6YCa55+l5oyC6L295Zyo5a6D6Lqr5LiK55qE5q+P5Liq6K6i6ZiF6ICF77yM5omn6KGM5omA5pyJ55qE5Zue6LCD5Ye95pWwXHJcbiAqIOW9k1JlZ2lzdGVy57G755qE6Z2Z5oCB5bGe5oCndGFyZ2V05LiN5Li656m65pe277yM6K6+5a6a5bGe5oCn5YC85pe25bGe5oCn5Lya5oqKdGFyZ2V05oyH5ZCR55qE6K6i6ZiF6ICF5L+d5a2Y6LW35p2lXHJcbiAqL1xyXG5jbGFzcyBSZWdpc3RlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLndhdGNoZXJBcnJheSA9IFtdO1xyXG4gICAgfVxyXG4gICAgYWRkV2F0Y2hlcih3YXRjaGVyKSB7XHJcbiAgICAgICAgdGhpcy53YXRjaGVyQXJyYXkucHVzaCh3YXRjaGVyKTtcclxuICAgIH1cclxuICAgIG5vdGlmeSgpIHtcclxuICAgICAgICB0aGlzLndhdGNoZXJBcnJheS5mb3JFYWNoKCh3YXRjaGVyKSA9PiB7XHJcbiAgICAgICAgICAgIHdhdGNoZXIuZXhlY3V0ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUmVnaXN0ZXIgPSBSZWdpc3RlcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5XYXRjaGVyID0gdm9pZCAwO1xyXG4vKipcclxuICogV2F0Y2hlcuexu+eUqOS6juihqOekuuS4gOS4quWujOaVtOeahOiuoumYhe+8mlxyXG4gKiBwcml2YXRlIHRhc2vvvJrlrZjmlL7orqLpmIXop6blj5Hml7bnmoTlm57osIPlh73mlbBcclxuICogcHJpdmF0ZSBhcmdzOiDlm57osIPlh73mlbDnmoTlj4LmlbBcclxuICogcHJpdmF0ZSBjb250ZXh077ya5Y+v5Lul6YCa6L+H6K+l5Y+C5pWw5oyH5a6a5Zue6LCD5Ye95pWw5omn6KGM55qE5LiK5LiL5paHXHJcbiAqL1xyXG5jbGFzcyBXYXRjaGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHRhc2ssIGFyZ3MsIGNvbnRleHQpIHtcclxuICAgICAgICB0aGlzLnRhc2sgPSB0YXNrO1xyXG4gICAgICAgIHRoaXMuYXJncyA9IGFyZ3M7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuICAgIH1cclxuICAgIC8vIOaJp+ihjOWbnuiwg+WHveaVsFxyXG4gICAgZXhlY3V0ZSgpIHtcclxuICAgICAgICB0aGlzLnRhc2suYXBwbHkodGhpcy5jb250ZXh0LCB0aGlzLmFyZ3MpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuV2F0Y2hlciA9IFdhdGNoZXI7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuZGVlcENsb25lID0gZXhwb3J0cy5zZXRVc2VySW5wdXRWYWx1ZSA9IGV4cG9ydHMuZ2V0VXNlcklucHV0VmFsdWUgPSBleHBvcnRzLmdldEV2ZW50TmFtZSA9IGV4cG9ydHMuaXNGb3JtSW5wdXRFbGVtZW50ID0gZXhwb3J0cy50eXBlTmFtZU9mID0gZXhwb3J0cy5yYW5kb21TdHJpbmcgPSBleHBvcnRzLnRyaW1BbGxTcGFjZSA9IHZvaWQgMDtcclxuLyoqXHJcbiAqIOWHveaVsOaOpeWPl+S4gOS4quWtl+espuS4suWPguaVsO+8jOi/lOWbnuivpeWtl+espuS4suWOu+aOieaJgOacieepuuagvOWQjueahOWtl+espuS4suWJr+acrFxyXG4gKiBAcGFyYW0gc3RyIOWOu+aOieepuuagvOWJjeeahOWOn+Wtl+espuS4slxyXG4gKiBAcmV0dXJucyDov5Tlm57nu5PmnpzlrZfnrKbkuLJcclxuICovXHJcbmZ1bmN0aW9uIHRyaW1BbGxTcGFjZShzdHIpIHtcclxuICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxzKi9nLCBcIlwiKTtcclxufVxyXG5leHBvcnRzLnRyaW1BbGxTcGFjZSA9IHRyaW1BbGxTcGFjZTtcclxuLyoqXHJcbiAqIOWHveaVsOaOpeWPl+S4gOS4quaVsOWAvOexu+Wei+WPguaVsO+8jOi/lOWbnuS4gOS4qumVv+W6puS4um51beeahOmaj+acuuWtl+espuS4slxyXG4gKiBAcGFyYW0gbnVtIOeUn+aIkOeahOmaj+acuuWtl+espuS4sueahOmVv+W6plxyXG4gKiBAcmV0dXJucyDov5Tlm57pmo/mnLrlrZfnrKbkuLJcclxuICovXHJcbmZ1bmN0aW9uIHJhbmRvbVN0cmluZyhudW0gPSAxMjgpIHtcclxuICAgIGxldCBpID0gMCwgcmVzdWx0ID0gJyc7XHJcbiAgICBmb3IgKDsgaSA8IG51bTsgaSsrKSB7XHJcbiAgICAgICAgbGV0IG4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyNiArIDk3KTtcclxuICAgICAgICByZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShuKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuZXhwb3J0cy5yYW5kb21TdHJpbmcgPSByYW5kb21TdHJpbmc7XHJcbi8qKlxyXG4gKiDlh73mlbDmjqXlj5fkuIDkuKrku7vmhI/nsbvlnovnmoTlj4LmlbDvvIzov5Tlm57lj4LmlbDnmoTlj5jph4/nsbvlnotcclxuICogQHBhcmFtIG9iaiDopoHooqvmo4DmtYvnsbvlnovnmoTlj5jph49cclxuICogQHJldHVybnMg6L+U5Zue57G75Z6L5a2X56ym5LiyXHJcbiAqL1xyXG5mdW5jdGlvbiB0eXBlTmFtZU9mKG9iaikge1xyXG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xyXG59XHJcbmV4cG9ydHMudHlwZU5hbWVPZiA9IHR5cGVOYW1lT2Y7XHJcbi8qKlxyXG4gKiDlh73mlbDmjqXlj5fkuIDkuKrmlofmoaPoioLngrnlr7nosaHvvIzmo4DmtYvov5nkuKroioLngrnmmK/lkKblhYHorrjlj4zlkJHnu5HlrprmlbDmja5cclxuICogQHBhcmFtIG5vZGUg6KaB6KKr5qOA5rWL55qE5paH5qGj6IqC54K5XHJcbiAqIEByZXR1cm5zIOi/lOWbnuajgOa1i+e7k+aenFxyXG4gKi9cclxuZnVuY3Rpb24gaXNGb3JtSW5wdXRFbGVtZW50KG5vZGUpIHtcclxuICAgIGNvbnN0IHRhZ05hbWUgPSBub2RlLnRhZ05hbWU7XHJcbiAgICBjb25zdCBuID0gdGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgY29uc3QgdCA9IG5vZGUuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XHJcbiAgICBpZiAobiA9PT0gJ3RleHRhcmVhJykge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAobiA9PT0gJ2lucHV0Jykge1xyXG4gICAgICAgIC8vIOWmguaenGlucHV05LiN5YaZdHlwZeWxnuaAp++8jOm7mOiupOaYr3RleHTovpPlhaXmoYZcclxuICAgICAgICBpZiAoIXQgfHwgdCA9PT0gJ3NlbGVjdCcgfHwgdCA9PT0gJ3JhZGlvJyB8fCB0ID09PSAnY2hlY2tib3gnIHx8IHQgPT09ICd0ZXh0Jykge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuZXhwb3J0cy5pc0Zvcm1JbnB1dEVsZW1lbnQgPSBpc0Zvcm1JbnB1dEVsZW1lbnQ7XHJcbi8qKlxyXG4gKiBnZXRFdmVudE5hbWXlh73mlbDvvJrmjqXlj5fkuIDkuKpET03lhYPntKDoioLngrnvvIzov5Tlm57lupTor6XkuLrku5bmt7vliqDnmoTkuovku7bnsbvlnotcclxuICogQHBhcmFtIG5vZGUg6KKr5re75Yqg5LqL5Lu255uR5ZCs5Zmo55qE6IqC54K5XHJcbiAqIEByZXR1cm5zIOi/lOWbnua3u+WKoOeahOS6i+S7tuexu+Wei+Wtl+espuS4slxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0RXZlbnROYW1lKG5vZGUpIHtcclxuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCB0eXBlID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpO1xyXG4gICAgaWYgKG5hbWUgPT09ICd0ZXh0YXJlYScgfHwgKG5hbWUgPT09ICdpbnB1dCcgJiYgKHR5cGUgPT09ICd0ZXh0JyB8fCAhdHlwZSkpKSB7XHJcbiAgICAgICAgcmV0dXJuICdpbnB1dCc7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChuYW1lID09PSAnc2VsZWN0Jykge1xyXG4gICAgICAgIHJldHVybiAnY2hhbmdlJztcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHJldHVybiAnY2xpY2snO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuZ2V0RXZlbnROYW1lID0gZ2V0RXZlbnROYW1lO1xyXG4vKipcclxuICogZ2V0VXNlcklucHV0VmFsdWXlh73mlbDvvJrmjqXlj5fkuIDkuKpET03lhYPntKDoioLngrnvvIzov5Tlm57oioLngrnljIXlkKvnmoTlgLxcclxuICogQHBhcmFtIG5vZGUg6KKr5re75Yqg5LqL5Lu255uR5ZCs5Zmo55qE6IqC54K5XHJcbiAqIEByZXR1cm5zIOi/lOWbnuivpeiKgueCueeahOWAvFxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0VXNlcklucHV0VmFsdWUobm9kZSkge1xyXG4gICAgY29uc3QgbmFtZSA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgIGNvbnN0IHR5cGUgPSBub2RlLmdldEF0dHJpYnV0ZSgndHlwZScpO1xyXG4gICAgbGV0IGFsaWFzO1xyXG4gICAgc3dpdGNoIChuYW1lKSB7XHJcbiAgICAgICAgY2FzZSAnaW5wdXQnOlxyXG4gICAgICAgICAgICBhbGlhcyA9IG5vZGU7XHJcbiAgICAgICAgICAgIGlmICghdHlwZSB8fCB0eXBlID09PSAnaW5wdXQnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxpYXMudmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxpYXMuY2hlY2tlZCA/IGFsaWFzLnZhbHVlIDogJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBjYXNlICdzZWxlY3QnOlxyXG4gICAgICAgICAgICBhbGlhcyA9IG5vZGU7XHJcbiAgICAgICAgICAgIHJldHVybiBhbGlhcy52YWx1ZTtcclxuICAgICAgICBjYXNlICd0ZXh0YXJlYSc6XHJcbiAgICAgICAgICAgIGFsaWFzID0gbm9kZTtcclxuICAgICAgICAgICAgcmV0dXJuIGFsaWFzLnZhbHVlO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxufVxyXG5leHBvcnRzLmdldFVzZXJJbnB1dFZhbHVlID0gZ2V0VXNlcklucHV0VmFsdWU7XHJcbi8qKlxyXG4gKiBzZXRVc2VySW5wdXRWYWx1ZeWHveaVsO+8muiKgueCuee7keWumueahOaVsOaNruWPmOWMluaXtu+8jOWPjemmiOWIsOiKgueCueS4ilxyXG4gKiBAcGFyYW0gbm9kZSDooqvmt7vliqDkuovku7bnm5HlkKzlmajnmoToioLngrlcclxuICogQHBhcmFtIHZhbHVlIOe7meivpeiKgueCueiuvue9rueahOWAvFxyXG4gKi9cclxuZnVuY3Rpb24gc2V0VXNlcklucHV0VmFsdWUobm9kZSwgdmFsdWUpIHtcclxuICAgIGNvbnN0IHN0ciA9IHZhbHVlID8gdmFsdWUudG9TdHJpbmcoKSA6ICcnO1xyXG4gICAgY29uc3QgbmFtZSA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmIChuYW1lID09PSAnc2VsZWN0Jykge1xyXG4gICAgICAgIGNvbnN0IHNlbGVjdCA9IG5vZGU7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHNlbGVjdC5vcHRpb25zO1xyXG4gICAgICAgIEFycmF5LmZyb20ob3B0aW9ucykuc29tZSgob3ApID0+IHtcclxuICAgICAgICAgICAgaWYgKG9wLnZhbHVlID09PSBzdHIpIHtcclxuICAgICAgICAgICAgICAgIG9wLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKG5hbWUgPT09ICdpbnB1dCcpIHtcclxuICAgICAgICBjb25zdCB0eXBlID0gbm9kZS5nZXRBdHRyaWJ1dGUoJ3R5cGUnKTtcclxuICAgICAgICBjb25zdCBuID0gbm9kZTtcclxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxyXG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RyID09PSBuLnZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbi5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIG51bGw6XHJcbiAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxyXG4gICAgICAgICAgICAgICAgbi52YWx1ZSA9IHN0cjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYgKG5hbWUgPT09ICd0ZXh0YXJlYScpIHtcclxuICAgICAgICBjb25zdCBuID0gbm9kZTtcclxuICAgICAgICBuLnZhbHVlID0gc3RyO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuc2V0VXNlcklucHV0VmFsdWUgPSBzZXRVc2VySW5wdXRWYWx1ZTtcclxuLyoqXHJcbiAqXHJcbiAqIEBwYXJhbSBvYmog6KaB6KKr5YWL6ZqG55qE5Y+Y6YePXHJcbiAqIEBwYXJhbSBtYXAg77yI5Y+v6YCJ77yJ5a+55Y+Y6YeP5ZKM5Y+Y6YeP5omA5pyJ5a2Q5bGe5oCn77yI5aaC5p6c5pyJ77yJ5YWL6ZqG5ZCO55qE5paw5a+55bqU54mp55qE5pig5bCE6KeE5YiZXHJcbiAqIEByZXR1cm5zIOWFi+mahuWQjueahOWPmOmHj1xyXG4gKi9cclxuZnVuY3Rpb24gZGVlcENsb25lKG9iaiwgbWFwKSB7XHJcbiAgICAvLyBhdHRyU2V05L+d5a2Y5bey57uP6KKr5YWL6ZqG6L+H55qE5a+56LGh5byV55So77yM6YG/5YWN5b6q546v5byV55So5peg6ZmQ5aSN5Yi2XHJcbiAgICBjb25zdCBhdHRyU2V0ID0gbmV3IFNldCgpO1xyXG4gICAgZnVuY3Rpb24gX2RlZXBDbG9uZShvYmopIHtcclxuICAgICAgICBsZXQgdE5hbWUgPSB0eXBlTmFtZU9mKG9iaik7XHJcbiAgICAgICAgc3dpdGNoICh0TmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdudWxsJzpcclxuICAgICAgICAgICAgY2FzZSAndW5kZWZpbmVkJzpcclxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwID8gbWFwKG9iaikgOiBvYmo7XHJcbiAgICAgICAgICAgIGNhc2UgJ3N5bWJvbCc6XHJcbiAgICAgICAgICAgICAgICBsZXQgdG1wID0ge307XHJcbiAgICAgICAgICAgICAgICB0bXBbb2JqXSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN5bXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHRtcCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwID8gbWFwKHN5bXNbMF0pIDogc3ltc1swXTtcclxuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxyXG4gICAgICAgICAgICAgICAgY29uc3QgZiA9IG5ldyBGdW5jdGlvbigncmV0dXJuICcgKyBvYmopKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFwID8gbWFwKGYpIDogZjtcclxuICAgICAgICAgICAgY2FzZSAnZGF0ZSc6XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUob2JqKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXAgPyBtYXAoZGF0ZSkgOiBkYXRlO1xyXG4gICAgICAgICAgICBjYXNlICdyZWdleHAnOlxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXhwID0gbmV3IFJlZ0V4cChvYmopO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcCA/IG1hcChyZWdleHApIDogcmVnZXhwO1xyXG4gICAgICAgICAgICBjYXNlICdzZXQnOlxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0ID0gbmV3IFNldChvYmopO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hcCA/IG1hcChzZXQpIDogc2V0O1xyXG4gICAgICAgICAgICBjYXNlICdtYXAnOlxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWFwQ29weSA9IG5ldyBNYXAob2JqKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXAgPyBtYXAobWFwQ29weSkgOiBtYXBDb3B5O1xyXG4gICAgICAgICAgICAvLyDlpoLmnpzmmK/mlbDnu4TmiJbogIXlr7nosaHvvIzpnIDopoHpgJLlvZLlhYvpmoZcclxuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxyXG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxyXG4gICAgICAgICAgICAgICAgLy8g5aaC5p6c6K+l5a+56LGh5byV55So5bey57uP6KKr5re75Yqg5YiwU2V05Lit77yM5LiN6ZyA6KaB5rex5bqm5YWL6ZqG5pW05Liq5a+56LGh77yM5LuF6ZyA6KaB5YWL6ZqG5byV55So5Y2z5Y+vXHJcbiAgICAgICAgICAgICAgICBpZiAoYXR0clNldC5oYXMob2JqKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXAgPyBtYXAob2JqKSA6IG9iajtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGF0dHJTZXQuYWRkKG9iaik7XHJcbiAgICAgICAgICAgICAgICBsZXQgcHJvcE5hbWUgPSBPYmplY3Qua2V5cyhvYmopO1xyXG4gICAgICAgICAgICAgICAgbGV0IHByb3BTeW1ib2wgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iaik7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gdE5hbWUgPT09ICdhcnJheScgPyBbXSA6IHt9O1xyXG4gICAgICAgICAgICAgICAgLy8g6YGN5Y6G5a+56LGh55qE5omA5pyJ5bGe5oCn77yM5L6d5qyh5aSN5Yi2XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpIG9mIHByb3BOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2ldID0gX2RlZXBDbG9uZShvYmpbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSBvZiBwcm9wU3ltYm9sKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2ldID0gX2RlZXBDbG9uZShvYmpbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbWFwID8gbWFwKHJlc3VsdCkgOiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBfZGVlcENsb25lKG9iaik7XHJcbn1cclxuZXhwb3J0cy5kZWVwQ2xvbmUgPSBkZWVwQ2xvbmU7XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLk1WVk0gPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCBjb21waWxlcl8xID0gcmVxdWlyZShcIi4vY29yZS9jb21waWxlL2NvbXBpbGVyXCIpO1xyXG5jb25zdCBvYnNlcnZlXzEgPSByZXF1aXJlKFwiLi9jb3JlL29ic2VydmVyL29ic2VydmVcIik7XHJcbmNvbnN0IHJlZ2lzdGVyXzEgPSByZXF1aXJlKFwiLi9jb3JlL29ic2VydmVyL3JlZ2lzdGVyXCIpO1xyXG5jb25zdCB3YXRjaGVyXzEgPSByZXF1aXJlKFwiLi9jb3JlL29ic2VydmVyL3dhdGNoZXJcIik7XHJcbmNvbnN0IHV0aWxfMSA9IHJlcXVpcmUoXCIuL2NvcmUvdXRpbFwiKTtcclxuLyoqXHJcbiAqIE1WVk3nsbvvvJpNVlZN5qGG5p625Li757G7XHJcbiAqIE1WVk3nsbvotJ/otKPliJvlu7rmlrDnmoTlupTnlKjvvIzliJ3lp4vljJbmlbDmja7vvIzlsIblupTnlKjmjILovb3liLBET03oioLngrnkuIrvvIzosIPnlKhDb21waWxlcuexu+e8luivkeaWh+aho++8jOW7uueri+aVsOaNruWIsOaWh+aho+iKgueCueeahOWFs+ezu1xyXG4gKi9cclxuY2xhc3MgTVZWTSB7XHJcbiAgICAvKipcclxuICAgICAqIE1WVk3nsbvmnoTpgKDlh73mlbDvvIzmjqXlj5fkuIDkuKrljIXlkKvmiYDmnInlupTnlKjpnIDopoHnmoTmlbDmja7nmoTlr7nosaHvvIzlubblr7nlhbbliJ3lp4vljJZcclxuICAgICAqIEBwYXJhbSBvcHRpb25zIOWIneWni+WMluW6lOeUqOeahOaVsOaNruWvueixoVxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5ob29rcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuX2RhdGEgPSBvcHRpb25zLmRhdGEoKTtcclxuICAgICAgICB0aGlzLl9jb21wdXRlZCA9IG9wdGlvbnMuY29tcHV0ZWQ7XHJcbiAgICAgICAgdGhpcy5fd2F0Y2ggPSBvcHRpb25zLndhdGNoO1xyXG4gICAgICAgIHRoaXMuX21ldGhvZHMgPSBvcHRpb25zLm1ldGhvZHM7XHJcbiAgICAgICAgLy8g5bCG6K6h566X5bGe5oCn77yM5pa55rOV5bGe5oCn77yM55uR5ZCs5bGe5oCn55qE5pa55rOV5YWo6YOo6L2s56e75Yiw5pWw5o2u5bGe5oCn5Lit77yM57uf5LiA566h55CGXHJcbiAgICAgICAgaWYgKHRoaXMuX2NvbXB1dGVkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkQXR0ciA9IE9iamVjdC5rZXlzKHRoaXMuX2NvbXB1dGVkKTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSBvZiBjb21wdXRlZEF0dHIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2RhdGFbaV0gPSB0aGlzLl9jb21wdXRlZFtpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5fd2F0Y2gpIHtcclxuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWRBdHRyID0gT2JqZWN0LmtleXModGhpcy5fd2F0Y2gpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIG9mIGNvbXB1dGVkQXR0cikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZGF0YVtpXSA9IHRoaXMuX3dhdGNoW2ldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLl9tZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkQXR0ciA9IE9iamVjdC5rZXlzKHRoaXMuX21ldGhvZHMpO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpIG9mIGNvbXB1dGVkQXR0cikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZGF0YVtpXSA9IHRoaXMuX21ldGhvZHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogIOWFi+mahuaVsOaNruWxnuaAp++8jOW5tuaJqeWxleaVsOaNruWxnuaAp+eahOavj+S4quWxnuaAp+WAvOaIkOS4uuS4gOS4quWvueixoe+8jOWvueixoeS4reS/neWtmOWxnuaAp+WAvO+8jOWxnuaAp+eahOWPkeW4g+iAheexu++8jOaYr+WQpuaYr+WfuuacrOexu+Wei+etieS/oeaBr1xyXG4gICAgICAgICAqIOWwhuWxnuaAp+WQjeWSjOWxnuaAp+eahOWQhOmhueWPguaVsOino+iApu+8jOaWueS+v+S7peWQjueahOaJqeWxlVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuJGRhdGEgPSAoMCwgdXRpbF8xLmRlZXBDbG9uZSkodGhpcy5fZGF0YSwgKG9iaikgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0TmFtZSA9ICgwLCB1dGlsXzEudHlwZU5hbWVPZikob2JqKTtcclxuICAgICAgICAgICAgaWYgKHROYW1lID09PSAnb2JqZWN0JyB8fCB0TmFtZSA9PT0gJ2FycmF5Jykge1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgY29uc3RhbnRzXzEuZGF0YVZhbHVlU3ltYm9sLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogb2JqLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVwOiBuZXcgcmVnaXN0ZXJfMS5SZWdpc3RlcigpLFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sIGNvbnN0YW50c18xLmRhdGFWYWx1ZVN5bWJvbCwge1xyXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBvYmosXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jhc2ljJyxcclxuICAgICAgICAgICAgICAgICAgICBkZXA6IG5ldyByZWdpc3Rlcl8xLlJlZ2lzdGVyKCksXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBtb3VudOWwhuW6lOeUqOaMgui9veWIsHNlbGVjdG9yQ1NT6YCJ5oup5Zmo6YCJ5Lit55qE56ys5LiA5LiqRE9N6IqC54K55LiK77yM57yW6K+R6K+l6IqC54K577yM6Kej5p6Q6IqC54K55YaF5YyF5ZCr55qE5omA5pyJ6KGo6L6+5byP77yM5oyH5Luk562JXHJcbiAgICAgKiDlsIbop6PmnpDlkI7lvpfliLDnmoRET03mk43kvZzlh73mlbDmjILovb3liLDnm7jlupTmlbDmja7nmoTlj5HluIPlmajkuIpcclxuICAgICAqIEBwYXJhbSBzZWxlY3RvciBET03oioLngrnpgInmi6nlmajlrZfnrKbkuLJcclxuICAgICAqIEByZXR1cm5zXHJcbiAgICAgKi9cclxuICAgIG1vdW50KHNlbGVjdG9yKSB7XHJcbiAgICAgICAgY29uc3QgY29tcGlsZXIgPSBuZXcgY29tcGlsZXJfMS5Db21waWxlcihzZWxlY3RvciwgdGhpcyk7XHJcbiAgICAgICAgY29tcGlsZXIuc2hhbGxvd0NvbXBpbGUoKTtcclxuICAgICAgICBjb21waWxlci5wYXJzZUV4cHJlc3Npb24oKTtcclxuICAgICAgICBuZXcgb2JzZXJ2ZV8xLk9ic2VydmUodGhpcyk7XHJcbiAgICAgICAgY29tcGlsZXIucGFyc2VFdmVudEhhbmRsZXIoKTtcclxuICAgICAgICB0aGlzLl9pbml0KCk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZGF0YTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICog5Yid5aeL5YyW77yM5bCG6KeC5a+f6ICF57uR5a6a5Yiw5pWw5o2u5LiKXHJcbiAgICAgKi9cclxuICAgIF9pbml0KCkge1xyXG4gICAgICAgIGNvbnN0IGhvb2sgPSB0aGlzLmhvb2tzLCBkYXRhID0gdGhpcy4kZGF0YTtcclxuICAgICAgICBob29rLmZvckVhY2goZnVuY3Rpb24gKGgpIHtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGgudHlwZTtcclxuICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDmlbDmja7nu5HlrprmlofmnKzmj5LlgLznmoTlm57osIPlh73mlbBcclxuICAgICAgICAgICAgICAgIGNhc2UgMSAvKiBCaW5kVHlwZS5UZXh0SW50ZXJwb2xhdGlvbiAqLzpcclxuICAgICAgICAgICAgICAgICAgICBoLnN1YmZ1bmNzLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyXzEuUmVnaXN0ZXIudGFyZ2V0ID0gbmV3IHdhdGNoZXJfMS5XYXRjaGVyKGZuLCBbXSwgZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVyXzEuUmVnaXN0ZXIudGFyZ2V0ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIOe7keWumumZpG1vZGVs5pWw5o2u5Y+M5ZCR57uR5a6a5oyH5Luk5aSW55qE5oyH5Luk5aSE55CG5Ye95pWw77yI5Zug5Li65pe26Ze05YWz57O755uu5YmN5rKh5pyJ5a6M5oiQ77yJXHJcbiAgICAgICAgICAgICAgICBjYXNlIDIgLyogQmluZFR5cGUuRGlyZWN0aXZlICovOlxyXG4gICAgICAgICAgICAgICAgICAgIC8qIOi/memHjOWkhOeQhuaMh+S7pOmDqOWIhumhtemdouWIneWni+WMliAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChoLmZ1bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJfMS5SZWdpc3Rlci50YXJnZXQgPSBuZXcgd2F0Y2hlcl8xLldhdGNoZXIoaC5mdW5jLCBbXSwgZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGguZnVuYygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3Rlcl8xLlJlZ2lzdGVyLnRhcmdldCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5NVlZNID0gTVZWTTtcclxubGV0IHZtID0gbmV3IE1WVk0oe1xyXG4gICAgZGF0YSgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBuYW1lOiB7XHJcbiAgICAgICAgICAgICAgICBmaXJzdDogJ1BlaXJhbicsXHJcbiAgICAgICAgICAgICAgICBsYXN0OiAnUXUnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgICAgICAgICB0MTogJ0hlbGxvIFdvcmxkIScsXHJcbiAgICAgICAgICAgICAgICB0MjogJ0hlbGxvIFdvcmxkISEnLFxyXG4gICAgICAgICAgICAgICAgdDM6ICdIZWxsbyBXb3JsZCEhISdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGl0bGVJbmRleDoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3QxJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdmVoaWNsZToge1xyXG4gICAgICAgICAgICAgICAgYmljeWNsZTogJycsXHJcbiAgICAgICAgICAgICAgICBjYXI6ICcnLFxyXG4gICAgICAgICAgICAgICAgeWFjaHQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgcGxhbmU6ICcnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59KTtcclxubGV0IGRhdGEgPSB2bS5tb3VudChcIiNhcHBcIik7XHJcbi8vIOS9v+eUqOiAheebtOaOpemAmui/h21vdW506L+U5Zue55qE5pWw5o2u5a+56LGh5pON5L2cRE9NXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zdCBwZXJpb2QgPSAzO1xyXG4gICAgbGV0IHBoYXNlID0gMTtcclxuICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICBzd2l0Y2ggKHBoYXNlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIGRhdGEudGl0bGVJbmRleC50eXBlID0gJ3QxJztcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBkYXRhLnRpdGxlSW5kZXgudHlwZSA9ICd0Mic7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgZGF0YS50aXRsZUluZGV4LnR5cGUgPSAndDMnO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBoYXNlKys7XHJcbiAgICAgICAgcGhhc2UgPSBwaGFzZSAlIHBlcmlvZDtcclxuICAgIH0sIDE1MDApO1xyXG59KSgpO1xyXG5kYXRhLnZlaGljbGVbJ2JpY3ljbGUnXSA9ICfoh6rooYzovaYgJztcclxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9