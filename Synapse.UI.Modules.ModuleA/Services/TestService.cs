
namespace Synapse.UI.Modules.ModuleA.Services
{
    public interface ITestService
    {
        string Test();
    }
    public class TestService: ITestService
    {
        public string Test()
        {
            return "test service";
        }
    }
}
