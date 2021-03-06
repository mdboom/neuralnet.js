"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ActivationFunction {
    constructor() { }
    sigmoid(x, isDerivative) {
        if (!isDerivative) {
            return 1 / (1 + Math.exp(-x));
        }
        return x * (1 - x);
    }
    step(x) {
        if (x >= 1) {
            return 1;
        }
        return 0;
    }
    linear(x, derivative) {
        if (x < 0)
            return 0;
        return !derivative ? x : x * (1 - x);
    }
}
exports.ActivationFunction = ActivationFunction;
