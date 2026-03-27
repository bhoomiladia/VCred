import hre from "hardhat";
console.log("HRE keys:", Object.keys(hre));
if (hre.tasks) {
  console.log("Tasks sub-keys:", Object.keys(hre.tasks));
}
