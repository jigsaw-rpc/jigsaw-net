## Introduction

jigsaw-net is an Extension of Jigsaw-RPC, it build a **Logical Network** for jigsaws, and making networks to connect to each others.


## Usage

① Build an Logical Network by "NetHelper" for jigsaws

② Create an Network Interface for this Logical Network

③ Make the Interface created connecting to another Interface

④ Then all of jigsaws in these two Network can communicate to each other!

---

Network A Infomation:
```
Jigsaw Net Name: NetA

Host IP: 192.168.2.100
```

Network A :  net-a.js

```
let helperA = new NetHelper("NetA");
helperA.getNewInterface("intf","jigsaw://192.168.2.100/","NetB","intf");

/*
create a Interface of NetworkA named intf, and make this Interface connect to NetworkB's intf
*/
```
Network A : app.js

```

let ANode = RPC.GetJigsaw({name:"ANode",registry:"jigsaw://127.0.0.1:1001/"})
ANode.port("get",async()=>{
    console.log("recv a far away invoking request");
    return "cool!  you called across a Net!";
});
```

--- 

Network B Infomation:
```
Jigsaw Net Name: NetB

Host IP: 192.168.3.100
```

Network B : net-b.js
```
let helperB = new NetHelper("NetB");
helperB.getNewInterface("intf");

/*
create a Interface of NetworkB named intf, but don't connect to other interface.
*/
````

Network B : app.js
```
const { RPC } = require("jigsaw-rpc");
RPC.pre(Middleware.create("jigsaw://127.0.0.1/").handle());


let BNode = RPC.GetJigsaw({name:"BNode",registry:"jigsaw://127.0.0.1/"});

BNode.send("NetA/ANode:get").then(console.log);

/* will print 'cool! you called across a Net' */
```

---

You can use CLI Tool 'jgnet' to inspect this interface

<br />

run 'jgnet listintfs' in NetA will get this:
```
NetA

<intf> <- [ NetB:intf ]
```

run 'jgnet listintfs' in NetB will get this:

```
NetB

<intf> -> [ NetA:intf ]
```

## CLI Tool

if you run this command to install jigsaw-net globally, you will get the CLI Tool : jgnet
```
npm install jigsaw-net -g
```

run this to show help:
```
jgnet
```
```

  jigsaw-net is a set of components make jigsaws intercommunicating

  Usage:
      jgnet <start|stop|init|listintf|listnodes|list|ls> <args>

      jgnet init
      jgnet list
      jgnet listnodes jigsaw://127.0.0.1/
      jgnet listintfs jigsaw://127.0.0.1/
      jgnet start netconfig.js
      jgnet stop MyNetA
```

the CLI Tool help you to build a **Jigsaw Logical Network** easily.

---

① jgnet init:

This command will generate a file named **netconfig.js** . the config file contains:

```

module.exports = {
    "netname":"MyNetA",
    "routes":[
//      ["MyNetB","intf2"]
    ],
    "interfaces":[
        {
            "name":"intf1",
            "entry":"example.com",
        },
        {
            "name":"intf2",
            "entry":"127.0.0.1",
//          "to_registry":"jigsaw://example.com/",
//          "to_netname":"MyNetB",
//          "to_interface":"intf1"
        }
    ],
    "enable_registry":true
}

```


start the network described by the config file by running this 

(Must install PM2 firstly):

```
jgnet start netconfig.js 
```

②jgnet list

this command will print all **Network Helper** running on this computer.

③jgnet listnodes

this command will show all nodes of Jigsaw Registry Server you specified.

```
|-- jigsaw-net
|---- config
|---- helper
|-- intf1
|-- intf2
```

④jgnet listintfs

this command will show all interfaces of specified **Jigsaw Logical Network**

```
MyNetA

<intf1> ?  [        ]
<intf2> -> [ MyNetB : intf1 ]
```



