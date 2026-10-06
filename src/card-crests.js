// Code-native crests, centered on (0, 0), contained within a 356 px seal.
// Keep the drawing independent from Discord roles and permission rules.
export function drawSpecialCrest(c,kind,{accent,bright}){
 c.save();
 const path=points=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 const polygon=(points,fill,stroke,width=1)=>{path(points);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const line=(points,color,width=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
 const metal=c.createLinearGradient(-120,-150,125,165);
 metal.addColorStop(0,kind==='leader'?'#fff0c7':bright);metal.addColorStop(.38,kind==='leader'?'#ffc96f':'#ffab70');metal.addColorStop(.7,accent);metal.addColorStop(1,'#ffdfaf');
 const star=(x,y,r)=>polygon([[x,y-r],[x+r*.3,y-r*.3],[x+r,y],[x+r*.3,y+r*.3],[x,y+r],[x-r*.3,y+r*.3],[x-r,y],[x-r*.3,y-r*.3]],metal);
 if(kind==='leader'){
  // A crowned command shield, framed by two branches of laurel.
  polygon([[0,-169],[139,-89],[148,82],[0,178],[-148,82],[-139,-89]],null,accent+'38');
  for(const side of [-1,1]){
   c.save();c.scale(side,1);c.beginPath();c.moveTo(57,161);c.bezierCurveTo(126,136,154,63,140,-41);c.strokeStyle=metal;c.lineWidth=3;c.stroke();
   for(const [x,y]of [[140,-12],[143,20],[140,52],[131,83],[116,113],[96,138]]){
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+28,y-5,x+22,y-31);c.quadraticCurveTo(x-3,y-25,x,y);c.fillStyle=metal;c.fill();
    line([[x+2,y-3],[x+18,y-24]],'#5e341c',1);
   }c.restore();
  }
  const shield=[[0,-70],[105,-33],[92,71],[0,146],[-92,71],[-105,-33]];
  polygon(shield,'#241911',metal,4);
  polygon([[0,-57],[91,-23],[79,64],[0,128],[-79,64],[-91,-23]],null,accent+'65',1.5);
  polygon([[-88,-48],[-113,-133],[-49,-93],[0,-163],[49,-93],[113,-133],[88,-48]],metal);
  polygon([[-65,-68],[-74,-96],[-40,-75],[0,-125],[40,-75],[74,-96],[65,-68]],'#352215');
  polygon([[-88,-48],[88,-48],[80,-26],[-80,-26]],metal);
  line([[-66,-39],[66,-39]],'#8c4b22',2);
  for(const x of [-42,0,42])polygon([[x,-44],[x+5,-37],[x,-30],[x-5,-37]],'#241911');
  star(0,-163,7);star(0,108,9);
  c.textAlign='center';c.textBaseline='middle';c.font='64px IFJBold';c.fillStyle=metal;c.fillText('RK',0,34);
  line([[-52,80],[52,80]],accent+'70',1.5);
 }else if(kind==='ally'){
  // A pact seal: two linked rings inside a faceted shield. The weaving
  // stroke at the crossing makes the connection clear at thumbnail size.
  c.beginPath();c.arc(0,0,166,0,Math.PI*2);c.strokeStyle=accent+'35';c.lineWidth=1.5;c.stroke();
  for(let n=0;n<8;n++){
   const a=n*Math.PI/4;c.beginPath();c.arc(0,0,154,a+.12,a+.43);c.strokeStyle=metal;c.lineWidth=4;c.stroke();
  }
  polygon([[0,-127],[107,-70],[103,67],[0,147],[-103,67],[-107,-70]],'#241911',metal,3);
  polygon([[0,-111],[93,-61],[89,60],[0,128],[-89,60],[-93,-61]],null,accent+'45',1.5);
  star(0,-153,12);star(0,106,8);
  c.save();c.translate(0,-7);c.rotate(-Math.PI/4);
  const link=(x,y,color)=>{c.beginPath();c.roundRect(x,y,64,103,30);c.strokeStyle='#241911';c.lineWidth=27;c.stroke();c.strokeStyle=color;c.lineWidth=19;c.stroke();};
  link(-58,-79,bright);link(-6,-19,accent);
  // Restore a short front edge of the upper link over the lower link.
  c.beginPath();c.moveTo(6,-37);c.lineTo(6,-8);c.strokeStyle='#241911';c.lineWidth=27;c.stroke();c.strokeStyle=bright;c.lineWidth=19;c.stroke();
  c.restore();
  for(const side of [-1,1]){c.save();c.scale(side,1);polygon([[114,79],[129,84],[84,137],[72,125]],metal);polygon([[94,136],[88,147],[51,162],[54,147]],metal);c.restore();}
 }
 c.restore();
}
