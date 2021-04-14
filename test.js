const config = require('./config');

for(let key in config)
{
    for(let k in config[key])
    {
        console.log(`${k}: ${config[key][k]}`);
    }
}

console.log(config.configGrafana);