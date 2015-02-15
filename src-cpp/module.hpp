#ifndef MODULE_HPP
#define MODULE_HPP

#include <cuda.h>
#include <cuda_runtime_api.h>
#include "bindings.hpp"

namespace NodeCuda {

  class Module : public ObjectWrap {
    public:
      static void Initialize(Handle<Object> target);
      static Handle<Value> GetFunction(const Arguments& args);
      CUmodule m_module;
    protected:
      static Persistent<FunctionTemplate> constructor_template;
      static Handle<Value> TextureAlloc(const Arguments& args);
      static Handle<Value> Load(const Arguments& args);

      Module() : ObjectWrap(), m_module(0) {}

      ~Module() {}

    private:
      static Handle<Value> New(const Arguments& args);
      static void volumeTextureLoad(unsigned int width, unsigned int height, unsigned int depth, char * filename, Module *pmodule);
      static void otfTableTextureLoad(float4 *input_float_1D, unsigned int otf_size, Module *pmodule);
      static float4 * getOTFtable(int otf_start, int otf_end, int otf_size);


  };

}

#endif
