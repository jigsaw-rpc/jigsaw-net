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
        let index = str.indexOf("/");
        if(index == -1)
            throw new Error("can find the /");

        let domain_str = str.substr(0,index);
        let left_str = str.substring(index+1,str.length);
        
        let m_index = left_str.lastIndexOf(":");
        let regpath_str = left_str.substr(0,m_index);
        let method_str = left_str.substring(m_index+1,left_str.length);

        return new DomainPath(domain_str,regpath_str,method_str);
    }
}

export default DomainPath;
