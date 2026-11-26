import * as THREE from 'three';
// Large photographic strip lights, reflected by the bevels of the sculpture.
export function studioEnvironment(pmrem){
 const room=new THREE.Scene();room.background=new THREE.Color('#465266');
 const shell=new THREE.Mesh(new THREE.BoxGeometry(20,16,20),new THREE.MeshBasicMaterial({color:0x465266,side:THREE.BackSide}));room.add(shell);
 function panel(w,h,color,intensity,pos,target){const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);p.position.set(...pos);p.lookAt(...target);room.add(p);}
 panel(4,8,0xe6f2ff,4.5,[-5,4,3],[0,0,0]);
 panel(1.8,9,0xcadfff,3.2,[5,2,-3],[0,0,0]);
 panel(7,2,0xffffff,3.6,[0,7,0],[0,0,0]);
 panel(5,4,0x8b9db7,.55,[1,0,7],[0,0,0]);
 panel(3,3,0xffe7c5,.8,[-4,0,-5],[0,0,0]);
 const texture=pmrem.fromScene(room,.08).texture;
 room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return texture;
}
