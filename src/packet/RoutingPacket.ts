import Packet from "./Packet";

class RoutingPacket extends Packet{
        protected packetid : number = 1;
        public dst_pathstr:string = "";
        public from_domain:string = "";
        public isJSON:boolean = true;
        public payload:Buffer = Buffer.allocUnsafe(0);
    
        public encode() : void{
                super.encode.call(this);              
                this.enlarge(this.payload.length+1400);  
                this.writeString(this.dst_pathstr);
                this.writeString(this.from_domain);
                this.writeLargeBuffer(this.payload);
                this.writeUInt16(this.isJSON ? 1 : 0);
        }
        public decode() : void{
                super.decode.call(this); 
                this.dst_pathstr = this.readString();
                this.from_domain = this.readString();
                this.payload = this.readLargeBuffer();
                this.isJSON = this.readUInt16() == 1;
        }
    
}

export default RoutingPacket;
