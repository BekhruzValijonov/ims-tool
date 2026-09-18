import { describeRepoContract } from "./repoContract"
import { MemoryRepo } from "./MemoryRepo"

describeRepoContract("MemoryRepo", async (clock) => new MemoryRepo(clock))
