using Synapse.UI.Infrastructure;
using Synapse.UI.Modules.ModuleA.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Synapse.UI.Modules.ModuleA
{
    public class AddTestService: IAddModuleService
    {
        public int Priority => 1000;

        public void Execute(IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<ITestService, TestService>();
        }
    }
}
