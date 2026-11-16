import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function nextDevelopmentVersion(current){
 const match=/^0\.(0|[1-9]\d*)\.0$/.exec(current);
 if(!match)throw new Error('A publicação de teste exige uma versão 0.x.0. A versão 1.0 só pode ser definida por instrução explícita do usuário.');
 return `0.${BigInt(match[1])+1n}.0`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=new URL('../package.json',import.meta.url),data=JSON.parse(await readFile(file,'utf8'));
 if(process.argv.includes('--check')){nextDevelopmentVersion(data.version);process.stdout.write(`ANTROPOLOGO RPG v${data.version.split('.').slice(0,2).join('.')}\n`);}
 else{data.version=nextDevelopmentVersion(data.version);await writeFile(file,JSON.stringify(data,null,2)+'\n');process.stdout.write(`Próxima publicação: v${data.version.split('.').slice(0,2).join('.')}\n`);}
}
