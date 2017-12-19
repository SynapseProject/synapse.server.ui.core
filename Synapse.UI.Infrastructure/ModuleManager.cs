using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Synapse.UI.Infrastructure
{
    public static class ModuleManager
    {        
        private static IEnumerable<Assembly> assemblies;

        /// <summary>
        /// Gets the cached assemblies that have been set by the SetAssemblies method.
        /// </summary>
        public static IEnumerable<Assembly> Assemblies
        {
            get
            {
                return ModuleManager.assemblies;
            }
        }
       
        public static void SetAssemblies(IEnumerable<Assembly> assemblies)
        {
            ModuleManager.assemblies = assemblies;
            //ExtensionManager.types = new Dictionary<Type, IEnumerable<Type>>();
        }

        private static IEnumerable<Assembly> GetAssemblies(Func<Assembly, bool> predicate)
        {
            if (predicate == null)
                return ModuleManager.Assemblies;

            return ModuleManager.Assemblies.Where(predicate);
        }

        /// <summary>
        /// Gets the implementations of the type specified by the type parameter.
        /// </summary>
        /// <typeparam name="T">The type parameter to find implementations of.</typeparam>
        /// <returns>Found implementations of the given type.</returns>
        /// 
        public static IEnumerable<Type> GetImplementations<T>()
        {
            return ModuleManager.GetImplementations<T>(null);
        }
        public static IEnumerable<Type> GetImplementations<T>(Func<Assembly, bool> predicate)
        {
            Type type = typeof(T);
            List<Type> implementations = new List<Type>();
            foreach (Assembly assembly in ModuleManager.GetAssemblies(predicate))
            {
                foreach (Type exportedType in assembly.GetExportedTypes())
                    if (type.GetTypeInfo().IsAssignableFrom(exportedType) && exportedType.GetTypeInfo().IsClass)
                        implementations.Add(exportedType);
            }
            return implementations;
        }

        public static IEnumerable<T> GetInstances<T>()
        {
            return ModuleManager.GetInstances<T>(null, new object[] { });
        }
        public static IEnumerable<T> GetInstances<T>(params object[] args)
        {
            return ModuleManager.GetInstances<T>(null, args);
        }
        public static IEnumerable<T> GetInstances<T>(Func<Assembly, bool> predicate)
        {
            return ModuleManager.GetInstances<T>(predicate, new object[] { });
        }
        public static IEnumerable<T> GetInstances<T>(Func<Assembly, bool> predicate, params object[] args)
        {
            List<T> instances = new List<T>();

            foreach (Type implementation in ModuleManager.GetImplementations<T>(predicate))
            {
                if (!implementation.GetTypeInfo().IsAbstract)
                {
                    T instance = (T)Activator.CreateInstance(implementation, args);

                    instances.Add(instance);
                }
            }
            return instances;
        }
    }    
}
