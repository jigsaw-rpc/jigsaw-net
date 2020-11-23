import {RPCSpi} from "jigsaw-rpc"


class DomainPath{
    public domain:string;
    public regpath:string;
    public method:string;
    constructor(domain:string,regpath:string,method:string){
        this.domain = domain;
        this.regpath = regpath;
        this.method = method;
    }
    static parse(str:string){
        let path = RPCSpi.network.Path.fromString(str);
        

        let index = path.regpath.indexOf("/");
        if(index == -1)
            throw new Error("can find the /");

        let domain_str = path.regpath.substr(0,index);
        let regpath_str = path.regpath.substring(index+1,path.regpath.length);
        let method_str = path.method;

        return new DomainPath(domain_str,regpath_str,method_str);
    }
}

export default DomainPath;
