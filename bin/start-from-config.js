const {NetHelper} = require("../dist/api");

const assert = require("assert");
const meow = require("meow");
const path = require("path");

let cli = meow(`
    Usage:
        node start-from-config.js netconfig.js
`);

assert(cli.input[0],"must specified config");

let config = require(path.resolve(cli.input[0]));

assert(config.netname,"must specified config.netname");
assert(config.routes instanceof Array,"must specified config.routes");
assert(config.interfaces instanceof Array,"must specified config.interfaces");

for(let intf of config.interfaces){
    assert(intf.name);
    assert(intf.entry);
    
}


let helper = new NetHelper(config.netname,config.routes);

for(let intf of config.interfaces){
    helper.getInterfaceManager().getNewInterface(intf.name,intf.entry,intf.to_registry,intf.to_netname,intf.to_interface);
}

