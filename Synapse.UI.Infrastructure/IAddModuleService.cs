using Microsoft.Extensions.DependencyInjection;

namespace Synapse.UI.Infrastructure
{
    public interface IAddModuleService
    {
        int Priority { get; }
        void Execute(IServiceCollection serviceCollection);
    }
}
