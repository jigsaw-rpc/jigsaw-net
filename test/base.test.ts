
import { RPC } from "jigsaw-rpc";
import {Middleware,NetHelper} from "../src/api";
import Util from "util";
import assert from "assert";

const sleep = Util.promisify(setTimeout);

describe("Base Tests",()=>{
    it("should be closable",async function(){
        this.timeout(40*1000);

        let nethook = Middleware.create("jigsaw://127.0.0.1:1000/");
        
        let helperA = new NetHelper("testNetA",undefined,1000);
        helperA.getInterfaceManager().getNewInterface("intf","127.0.0.1");
        
        let helperB = new NetHelper("testNetB",undefined,1001);
        helperB.getInterfaceManager().getNewInterface("intf","127.0.0.1","jigsaw://127.0.0.1:1000/","testNetA","intf");
        
        
        let invoker = RPC.GetJigsaw({name:"invoker",registry:"jigsaw://127.0.0.1:1000/"});
        invoker.pre(nethook.handle());
        
        let pc = RPC.GetJigsaw({name:"pc",registry:"jigsaw://127.0.0.1:1001/"});
        
        pc.port("get",(data:any)=>{
            return data;
        });
        
        
        await sleep(10000);
        assert.deepStrictEqual(await invoker.send("testNetB/pc:get",[1,2,3]),[1,2,3]);
        
        await pc.close();
        await nethook.close();
        await invoker.close();
        await helperA.close();
        await helperB.close();
    })

})