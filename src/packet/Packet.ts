class Packet{
	protected packetid : number = 0;
    private buffer : Buffer = Buffer.allocUnsafe(3000);
	private offset : number = 0;

	public encode() : void{
        this.offset = 0;
        this.writeUInt16(this.packetid);
        
	}
	public decode() : void{
        this.offset = 0;
        this.packetid = this.readUInt16();

    }
    enlarge(size:number){
		let newbuffer = Buffer.allocUnsafe(size);
		//console.log(this.offset);
		this.buffer.slice(0,this.offset)
		.copy(newbuffer,0);

		this.buffer = newbuffer;

	}
    setBuffer(buf:Buffer){
        this.buffer = buf;
    }
    getBuffer(){
        return this.buffer;
    }

	protected writeUInt16(digit : number) : void{

		this.buffer.writeUInt16BE(digit,this.offset);
		this.offset+=2;

	}
	
	protected readUInt16() : number{

		let ret : number = this.buffer.readUInt16BE(this.offset);
		this.offset+=2;

		return ret;
	}
	protected writeUInt32(digit : number) : void{

		this.buffer.writeUInt32BE(digit,this.offset);
		this.offset+=2;

	}
	
	protected readUInt32() : number{

		let ret : number = this.buffer.readUInt32BE(this.offset);
		this.offset+=2;

		return ret;
	}
	protected writeString(str : string) : void{
		this.writeBuffer(Buffer.from(str));
	};
	protected readString() : string{
		return this.readBuffer().toString();
	};

	protected writeBuffer(buf : Buffer) : void{		
		this.buffer.writeUInt16BE(buf.length,this.offset);
		this.offset+=2;

		buf.copy(this.buffer,this.offset);
		this.offset+=buf.length;
	}
	protected readBuffer() : Buffer{

		let len=this.buffer.readUInt16BE(this.offset);
		this.offset+=2;

		let buf=this.buffer.slice(this.offset,this.offset+len);
		this.offset+=buf.length;

		return buf;
	};	
	protected writeLargeBuffer(buf : Buffer) : void{
		this.buffer.writeUInt32BE(buf.length,this.offset);
		this.offset+=4;

		buf.copy(this.buffer,this.offset);
		this.offset+=buf.length;

	}
	protected readLargeBuffer() : Buffer{

		let len=this.buffer.readUInt32BE(this.offset);
		this.offset+=4;

		let buf=this.buffer.slice(this.offset,this.offset+len);
		this.offset+=buf.length;

		return buf;
	};	
		
}

export default Packet;
