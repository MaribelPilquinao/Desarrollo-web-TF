import { MalvinoService } from './malvino.service';
describe('Malvino programado',()=>{
 const bot=new MalvinoService();
 it('confirma coincidencias solo según las fichas ficticias',()=>{expect(bot.check('case-13','iphone 13')).toContain('compatible');expect(bot.check('case-13','iphone 13')).toContain('ficticios');});
 it('propone una alternativa cuando la referencia no coincide',()=>{expect(bot.check('case-13','iphone 14')).toContain('Alternativa de demostración: Case de ejemplo para iPhone 14');});
 it('no inventa alternativas desconocidas',()=>{expect(bot.check('glass-13','iphone 14')).toContain('No tengo una alternativa');expect(bot.check('no-existe','iphone 13')).toContain('Selecciona');});
 it('pregunta por la variante del Samsung y la referencia del accesorio',()=>{expect(bot.answer('¿Esta batería sirve para Samsung A32?')).toContain('4G o 5G');expect(bot.answer('¿Este case sirve para un iPhone 13?')).toContain('referencia');});
 it('reconoce consultas fuera del alcance',()=>{expect(bot.answer('¿Qué tiempo hace?')).toContain('No tengo una respuesta programada');});
});
