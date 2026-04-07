async function main() {
  // ЗАМЕНИ НА АДРЕС СВОЕГО GREETER КОНТРАКТА (после деплоя)
  const GREETER_ADDRESS = "ВСТАВЬ_АДРЕС_КОНТРАКТА";

  const greeter = await ethers.getContractAt("Greeter", GREETER_ADDRESS);
  const greeting = await greeter.greet();
  console.log("Greeting:", greeting);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
