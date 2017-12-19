using Synapse.UI.Infrastructure;
using Synapse.UI.Modules.ModuleA.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Synapse.UI.Modules.ModuleA
{
    public class AddTestService: IAddModuleService
    {
        // this is an expression-bodied property member
        // the compiler will convert it into a getter
        // public int Priority {  get { return 1000; } }    
        public int Priority => 1000;

        public void Execute(IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<ITestService, TestService>();
        }
    }
}
