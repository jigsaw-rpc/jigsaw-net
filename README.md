## Introduction

jigsaw-net is an Extension of Jigsaw-RPC, it make all jigsaws can communicate to each others, even in Local Area Network.

## Usage

Under Network A
```

let helperA = new NetHelper("NetA",[],1001);
helperA.getNewInterface("intf","jigsaw://127.0.0.1:1002/","NetB","intf");
/*
create a Interface of NetworkA named intf, and make this Interface connect to NetworkB's intf
*/

let ANode = RPC.GetJigsaw({name:"ANode",registry:"jigsaw://127.0.0.1:1001/"})
ANode.port("get",async()=>{
    console.log("recv a far away invoking request");
    return "cool!  you called across a Net!";
});
```

Under Network B
```
let helperB = new NetHelper("NetB",[],1002);
helperB.getNewInterface("intf");
/*
create a Interface of NetworkB named intf, but don't connect to other interface.
*/
````

Under Network B
```
const { RPC } = require("jigsaw-rpc");
RPC.pre(Middleware.create("jigsaw://127.0.0.1:1002/").handle());


let BNode = RPC.GetJigsaw({name:"BNode",registry:"jigsaw://127.0.0.1:1002/"});



BNode.send("NetA/ANode:get").then(console.log);

/* will print 'cool! you called across a Net' */
```
