interface ISkill {
  cooldown: number;
  cooldownTimer: number;
}

interface IDash extends ISkill {

}

interface ISkill extends ISkill {}
interface ISkill extends ISkill {}
interface ISkill extends ISkill {}