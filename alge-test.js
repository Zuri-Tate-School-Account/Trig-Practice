const Algebrite = require('algebrite');
console.log('Result:', Algebrite.run('simplify(cos(x)^2 + sin(x)^2 - 1)'));
console.log('Result2:', Algebrite.run('simplify(tan(x) - sin(x)/cos(x))'));
console.log('Result3:', Algebrite.run('simplify(sin(2*x) - 2*sin(x)*cos(x))'));
