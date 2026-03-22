const nerdamer = require('nerdamer/all.min');

function verify(a, b) {
    try {
        return nerdamer(a).eq(b);
    } catch(e) { return false; }
}

console.log('Result1:', verify('cos(x)^2 + sin(x)^2', '1'));
console.log('Result2:', verify('tan(x)', 'sin(x)/cos(x)'));
console.log('Result3:', verify('sin(2*x)', '2*sin(x)*cos(x)'));
console.log('Result4:', verify('cos(2*x)', 'cos(x)^2 - sin(x)^2'));
console.log('Result5:', verify('sec(x)', '1/cos(x)'));
