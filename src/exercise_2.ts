import {
  Field,
  PrivateKey,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  UInt64,
  Mina,
  Party,
} from "@o1labs/snarkyjs";

class Exercise2 extends SmartContract {
  @state(Field) value: State<Field>;
  
  static UpdateReward: UInt64 = UInt64.fromNumber(100);

  constructor(initialBalance: UInt64, address: PublicKey, x: Field) {
    super(address);
    this.balance.addInPlace(initialBalance);
    this.value = State.init(x);
  }

  @method async update(cubed: Field) {
    const x = await this.value.get();
    x.square().mul(x).assertEquals(cubed);
    this.value.set(cubed);
    this.balance.subInPlace(Exercise2.UpdateReward);
  }
}

export async function run() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const account1 = Local.testAccounts[0].privateKey;
  const account2 = Local.testAccounts[1].privateKey;
  const account2Pubkey = account2.toPublicKey();

  const snappPrivkey = PrivateKey.random();
  const snappPubkey = snappPrivkey.toPublicKey();

  let snappInstance: Exercise2;
  const initSnappState = new Field(3);

  // Deploys the snapp
  await Mina.transaction(account1, async () => {
    // account2 sends 1000000000 to the new snapp account
    const amount = UInt64.fromNumber(1000000000);
    const p = await Party.createSigned(account2);
    p.balance.subInPlace(amount);

    snappInstance = new Exercise2(amount, snappPubkey, initSnappState);
  })
    .send()
    .wait();

  // Update the snapp, send the reward to account2
  await Mina.transaction(account1, async () => {
    // 27 = 3^3
    await snappInstance.update(new Field(27));
    const winner = Party.createUnsigned(account2Pubkey);
    winner.balance.addInPlace(Exercise2.UpdateReward);
  })
    .send()
    .wait();
    
  console.log('');
  console.log('Exercise 2');

  const a = await Mina.getAccount(account2Pubkey);

  console.log('Winner balance', a.balance);
}
