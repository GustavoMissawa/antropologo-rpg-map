import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCredentials,hashPassword,randomHex,constantTimeEqual } from '../lib/demo-auth.ts';
test('@ normaliza caixa e prefixo, e recusa caracteres inválidos',()=>{
 assert.deepEqual(parseCredentials({handle:' @Floresta_10 ',password:'teste_12345'}),{handle:'floresta_10',password:'teste_12345'});
 for(const handle of ['ab','espaço','duas palavras','a'.repeat(25),'nome@email'])assert.throws(()=>parseCredentials({handle,password:'teste_12345'}));
});
test('Senha preserva caracteres e exige 8 a 128 caracteres',()=>{
 assert.equal(parseCredentials({handle:'teste',password:' senha com espaços '}).password,' senha com espaços ');
 for(const password of ['',123,'a'.repeat(7),'a'.repeat(129)])assert.throws(()=>parseCredentials({handle:'teste',password}));
});
test('Salt individual muda o hash e a comparação reconhece somente o valor correto',async()=>{
 const salt=randomHex(16);const hash=await hashPassword('senha_de_teste',salt);assert.equal(hash.length,64);assert.equal(constantTimeEqual(hash,await hashPassword('senha_de_teste',salt)),true);assert.equal(constantTimeEqual(hash,await hashPassword('outra_senha',salt)),false);assert.notEqual(hash,await hashPassword('senha_de_teste',randomHex(16)));assert.equal(constantTimeEqual(hash,hash+'a'),false);
});
